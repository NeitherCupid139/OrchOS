import { os } from "@/server/orpc/base";
import { authenticateORPCRequest } from "@/server/orpc/context";
import { creditUsage, subscriptions } from "@/server/db/schema";
import { getLocalDb } from "@/server/runtime/local-db";
import { desc, eq } from "drizzle-orm";

async function getSubscriptionUserId(request: Request) {
  try {
    const auth = await authenticateORPCRequest(request);
    return auth?.userId ?? "local";
  } catch {
    return "local";
  }
}

function createFreeSubscription(userId: string) {
  const now = new Date().toISOString();

  return {
    userId,
    plan: "free" as const,
    creditsBalance: 100,
    creditsTotal: 100,
    tokensUsed: 0,
    periodStart: null,
    periodEnd: null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

async function ensureFreeSubscription(userId: string) {
  const db = await getLocalDb();
  const subscription = createFreeSubscription(userId);

  try {
    await db
      .insert(subscriptions)
      .values({
        userId: subscription.userId,
        plan: subscription.plan,
        creditsBalance: String(subscription.creditsBalance),
        creditsTotal: String(subscription.creditsTotal),
        tokensUsed: String(subscription.tokensUsed),
        periodStart: subscription.periodStart,
        periodEnd: subscription.periodEnd,
        status: subscription.status,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      })
      .run();
  } catch {
    const existing = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .get();

    if (existing) {
      return {
        userId: existing.userId,
        plan: existing.plan === "pro" ? "pro" as const : "free" as const,
        creditsBalance: Number(existing.creditsBalance),
        creditsTotal: Number(existing.creditsTotal),
        tokensUsed: Number(existing.tokensUsed),
        periodStart: existing.periodStart,
        periodEnd: existing.periodEnd,
        status: existing.status,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      };
    }
  }

  return subscription;
}

export const subscriptionRouter = {
  get: os.subscription.get.handler(async ({ context }) => {
    const userId = await getSubscriptionUserId(context.request);
    const db = await getLocalDb();
    const row = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .get();

    if (!row) {
      return ensureFreeSubscription(userId);
    }

    return {
      userId: row.userId,
      plan: row.plan === "pro" ? "pro" : "free",
      creditsBalance: Number(row.creditsBalance),
      creditsTotal: Number(row.creditsTotal),
      tokensUsed: Number(row.tokensUsed),
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }),
  usage: os.subscription.usage.handler(async ({ input, context }) => {
    const userId = await getSubscriptionUserId(context.request);
    const limit = input?.limit ?? 50;
    const offset = input?.offset ?? 0;
    const rows = await (await getLocalDb())
      .select()
      .from(creditUsage)
      .where(eq(creditUsage.userId, userId))
      .orderBy(desc(creditUsage.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return {
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        action: row.action,
        tokens: Number(row.tokens),
        credits: Number(row.credits),
        metadata: row.metadata,
        createdAt: row.createdAt,
      })),
      total: rows.length,
    };
  }),
};
