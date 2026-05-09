import { events, problems } from "@/server/db/schema";
import { os } from "@/server/orpc/base";
import { getLocalDb } from "@/server/runtime/local-db";

function getRangeDate(range: string): Date {
  const now = new Date();
  switch (range) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

export const observabilityRouter = {
  throughput: os.observability.throughput.handler(async ({ input }) => {
    const range = input.range ?? "24h";
    const db = await getLocalDb();
    const allEvents = await db.select().from(events).all();

    if (!Array.isArray(allEvents)) {
      return [];
    }

    const rangeDate = getRangeDate(range);
    const filteredEvents = allEvents.filter(
      (e) => new Date(e.timestamp) >= rangeDate,
    );

    const allProblems = await db.select().from(problems).all();
    const rangeProblems = allProblems.filter(
      (p) => new Date(p.createdAt) >= rangeDate,
    );

    const size = range === "24h" ? 24 : range === "7d" ? 7 : 30;
    const intervalMs = range === "24h"
      ? 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    const buckets: { time: number; label: string; events: number; issues: number }[] = [];
    for (let i = 0; i < size; i++) {
      const bucketStart = new Date(rangeDate.getTime() + i * intervalMs);
      const bucketEnd = new Date(bucketStart.getTime() + intervalMs);

      const eventCount = filteredEvents.filter((e) => {
        const t = new Date(e.timestamp).getTime();
        return t >= bucketStart.getTime() && t < bucketEnd.getTime();
      }).length;

      const issueCount = rangeProblems.filter((p) => {
        const t = new Date(p.createdAt).getTime();
        return t >= bucketStart.getTime() && t < bucketEnd.getTime();
      }).length;

      const label = range === "24h"
        ? `${String(bucketStart.getHours()).padStart(2, "0")}:00`
        : `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}`;

      buckets.push({ time: i, label, events: eventCount, issues: issueCount });
    }

    return buckets;
  }),
  metrics: os.observability.metrics.handler(async () => {
    const db = await getLocalDb();
    const [allEvents, allProblems] = await Promise.all([
      db.select().from(events).all(),
      db.select().from(problems).all(),
    ]);

    const eventTypeMap = new Map<string, number>();
    for (const event of allEvents) {
      eventTypeMap.set(event.type, (eventTypeMap.get(event.type) ?? 0) + 1);
    }
    const eventTypeCounts = Array.from(eventTypeMap.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    const openIssues = allProblems.filter((p) => p.status === "open").length;
    const resolvedIssues = allProblems.filter(
      (p) => p.status === "closed" || p.status === "resolved",
    ).length;

    const recentEvents = allEvents
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)
      .map((e) => ({
        id: e.id,
        type: e.type,
        payload: parsePayload(e.payload),
        timestamp: e.timestamp,
      }));

    return {
      totalEvents: allEvents.length,
      openIssues,
      resolvedIssues,
      eventTypeCounts,
      recentEvents,
    };
  }),
};

function parsePayload(payload: string): Record<string, unknown> {
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}
