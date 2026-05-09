import { and, desc, eq } from "drizzle-orm";
import type { AppDb } from "../../db/types";
import { localAgentPairings, localAgents } from "../../db/schema";
import { generateId, timestamp } from "../../utils";
import type { DetectedRuntime } from "../../runtime/execution-adapter";

const LOCAL_HOST_STALE_MS = 1000 * 60 * 2;
const PAIRING_TTL_MS = 1000 * 60 * 10;

function createToken(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function sha256(input: string) {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export interface LocalAgentProfile {
  id: string;
  userId: string;
  organizationId?: string;
  deviceId: string;
  name: string;
  platform?: string;
  appVersion?: string;
  status: "online" | "offline";
  runtimes: DetectedRuntime[];
  metadata: Record<string, string>;
  registeredAt: string;
  lastSeenAt: string;
}

export abstract class LocalAgentService {
  static async listForUser(db: AppDb, userId: string, organizationId?: string | null) {
    const rows = await db.select().from(localAgents).where(eq(localAgents.userId, userId)).orderBy(desc(localAgents.lastSeenAt)).all();
    return rows
      .flatMap((row) => !organizationId || row.organizationId === organizationId ? [LocalAgentService.mapRow(row)] : []);
  }

  static async heartbeat(
    db: AppDb,
    userId: string,
    organizationId: string | null,
    payload: {
      deviceId: string;
      name: string;
      platform?: string;
      appVersion?: string;
      runtimes: DetectedRuntime[];
      metadata?: Record<string, string>;
    },
  ) {
    const now = timestamp();
    const existing = await db
      .select()
      .from(localAgents)
      .where(and(eq(localAgents.userId, userId), eq(localAgents.deviceId, payload.deviceId)))
      .get();

    if (!existing) {
      const id = generateId("host");
      const hostToken = createToken("orchos_host");
      const hostTokenHash = await sha256(hostToken);
      await db.insert(localAgents).values({
        id,
        userId,
        organizationId: organizationId || null,
        deviceId: payload.deviceId,
        name: payload.name,
        hostToken: hostTokenHash,
        platform: payload.platform || null,
        appVersion: payload.appVersion || null,
        status: "online",
        runtimes: JSON.stringify(payload.runtimes),
        metadata: JSON.stringify(payload.metadata || {}),
        registeredAt: now,
        lastSeenAt: now,
      }).run();

      const created = await db.select().from(localAgents).where(eq(localAgents.id, id)).get();
      return LocalAgentService.mapRow(created!);
    }

    await db.update(localAgents).set({
      organizationId: organizationId || null,
      name: payload.name,
      platform: payload.platform || null,
      appVersion: payload.appVersion || null,
      status: "online",
      runtimes: JSON.stringify(payload.runtimes),
      metadata: JSON.stringify(payload.metadata || {}),
      lastSeenAt: now,
    }).where(eq(localAgents.id, existing.id)).run();

    const updated = await db.select().from(localAgents).where(eq(localAgents.id, existing.id)).get();
    return LocalAgentService.mapRow(updated!);
  }

  static async createPairingToken(db: AppDb, userId: string, organizationId: string | null) {
    const createdAt = timestamp();
    const expiresAt = new Date(Date.now() + PAIRING_TTL_MS).toISOString();
    const token = createToken("orchos_pair");
    await db.insert(localAgentPairings).values({
      id: generateId("pair"),
      token,
      userId,
      organizationId: organizationId || null,
      expiresAt,
      usedAt: null,
      createdAt,
    }).run();
    return { pairingToken: token, expiresAt };
  }

  static async pairAgent(
    db: AppDb,
    payload: {
      pairingToken: string;
      deviceId: string;
      name: string;
      platform?: string;
      appVersion?: string;
      metadata?: Record<string, string>;
    },
  ) {
    const pairing = await db.select().from(localAgentPairings).where(eq(localAgentPairings.token, payload.pairingToken)).get();
    if (!pairing) {
      throw new Error("Invalid pairing token");
    }
    if (pairing.usedAt) {
      throw new Error("Pairing token has already been used");
    }
    if (Date.parse(pairing.expiresAt) <= Date.now()) {
      throw new Error("Pairing token has expired");
    }

    const existing = await db
      .select()
      .from(localAgents)
      .where(and(eq(localAgents.userId, pairing.userId), eq(localAgents.deviceId, payload.deviceId)))
      .get();

    const hostToken = createToken("orchos_host");
    const hostTokenHash = await sha256(hostToken);
    const now = timestamp();

    if (!existing) {
      const hostId = generateId("host");
      await db.insert(localAgents).values({
        id: hostId,
        userId: pairing.userId,
        organizationId: pairing.organizationId || null,
        deviceId: payload.deviceId,
        name: payload.name,
        hostToken: hostTokenHash,
        platform: payload.platform || null,
        appVersion: payload.appVersion || null,
        status: "online",
        runtimes: "[]",
        metadata: JSON.stringify(payload.metadata || {}),
        registeredAt: now,
        lastSeenAt: now,
      }).run();
    } else {
      await db.update(localAgents).set({
        organizationId: pairing.organizationId || null,
        name: payload.name,
        hostToken: hostTokenHash,
        platform: payload.platform || null,
        appVersion: payload.appVersion || null,
        status: "online",
        metadata: JSON.stringify(payload.metadata || {}),
        lastSeenAt: now,
      }).where(eq(localAgents.id, existing.id)).run();
    }

    await db.update(localAgentPairings).set({ usedAt: now }).where(eq(localAgentPairings.id, pairing.id)).run();

    const host = await db
      .select()
      .from(localAgents)
      .where(and(eq(localAgents.userId, pairing.userId), eq(localAgents.deviceId, payload.deviceId)))
      .get();

    return { hostToken, host: LocalAgentService.mapRow(host!) };
  }

  static async getByHostToken(db: AppDb, hostToken: string) {
    const tokenHash = await sha256(hostToken);
    const row = await db.select().from(localAgents).where(eq(localAgents.hostToken, tokenHash)).get();
    if (!row) return undefined;
    return row;
  }

  static async heartbeatForAgentToken(
    db: AppDb,
    hostToken: string,
    payload: {
      deviceId: string;
      name: string;
      platform?: string;
      appVersion?: string;
      runtimes: DetectedRuntime[];
      metadata?: Record<string, string>;
    },
  ) {
    const host = await LocalAgentService.getByHostToken(db, hostToken);
    if (!host) {
      throw new Error("Invalid host token");
    }

    if (host.deviceId !== payload.deviceId) {
      throw new Error("Host token does not match device");
    }

    return LocalAgentService.heartbeat(db, host.userId, host.organizationId, payload);
  }

  static mapRow(row: typeof localAgents.$inferSelect): LocalAgentProfile {
    const lastSeenAt = row.lastSeenAt;
    const lastSeenTime = Date.parse(lastSeenAt);
    const isStale = Number.isNaN(lastSeenTime) || Date.now() - lastSeenTime > LOCAL_HOST_STALE_MS;

    return {
      id: row.id,
      userId: row.userId,
      organizationId: row.organizationId || undefined,
      deviceId: row.deviceId,
      name: row.name,
      platform: row.platform || undefined,
      appVersion: row.appVersion || undefined,
      status: isStale ? "offline" : "online",
      runtimes: JSON.parse(row.runtimes),
      metadata: JSON.parse(row.metadata),
      registeredAt: row.registeredAt,
      lastSeenAt,
    };
  }
}
