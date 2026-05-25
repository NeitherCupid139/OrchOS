import { desc, eq, gte, and, sql } from "drizzle-orm";
import { events, problems, messages, conversations } from "@/server/db/schema";
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

function parseTrace(trace: string | null): Array<{ kind: string; state?: string }> {
  if (!trace) return [];
  try {
    const parsed = JSON.parse(trace);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parsePayload(payload: string): Record<string, unknown> {
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Maximum number of rows to return from range-limited queries.
 * Prevents unbounded memory growth on large event/message tables.
 */
const MAX_RANGE_ROWS = 10_000;
/** Maximum number of recent items to return in list views. */
const MAX_RECENT_ITEMS = 100;

export const observabilityRouter = {
  throughput: os.observability.throughput.handler(async ({ input }) => {
    const range = input.range ?? "24h";
    const db = await getLocalDb();
    const rangeDate = getRangeDate(range);
    const rangeDateStr = rangeDate.toISOString();

    // SQL-level filtering: only load data within the time range
    const [rangeEvents, rangeProblems] = await Promise.all([
      db.select().from(events).where(gte(events.timestamp, rangeDateStr)).all(),
      db.select().from(problems).where(gte(problems.createdAt, rangeDateStr)).all(),
    ]);

    const size = range === "24h" ? 24 : range === "7d" ? 7 : 30;
    const intervalMs =
      range === "24h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const buckets: { time: number; label: string; events: number; issues: number }[] = [];
    for (let i = 0; i < size; i++) {
      const bucketStart = new Date(rangeDate.getTime() + i * intervalMs);
      const bucketEnd = new Date(bucketStart.getTime() + intervalMs);

      const eventCount = rangeEvents.filter((e) => {
        const t = new Date(e.timestamp).getTime();
        return t >= bucketStart.getTime() && t < bucketEnd.getTime();
      }).length;

      const issueCount = rangeProblems.filter((p) => {
        const t = new Date(p.createdAt).getTime();
        return t >= bucketStart.getTime() && t < bucketEnd.getTime();
      }).length;

      const label =
        range === "24h"
          ? `${String(bucketStart.getHours()).padStart(2, "0")}:00`
          : `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}`;

      buckets.push({ time: i, label, events: eventCount, issues: issueCount });
    }

    return buckets;
  }),

  metrics: os.observability.metrics.handler(async () => {
    const db = await getLocalDb();

    // Use aggregate queries instead of loading all rows
    const [totalEventsResult, eventTypeRows, problemCountRows, recentEvents] =
      await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(events)
          .all(),
        db
          .select({
            type: events.type,
            count: sql<number>`count(*)`,
          })
          .from(events)
          .groupBy(events.type)
          .all(),
        db
          .select({
            status: problems.status,
            count: sql<number>`count(*)`,
          })
          .from(problems)
          .groupBy(problems.status)
          .all(),
        db
          .select()
          .from(events)
          .orderBy(desc(events.timestamp))
          .limit(MAX_RECENT_ITEMS)
          .all(),
      ]);

    const totalEvents = totalEventsResult[0]?.count ?? 0;

    const eventTypeCounts = eventTypeRows.map((row) => ({
      type: row.type,
      count: row.count,
    }));

    const problemCountMap = new Map(problemCountRows.map((r) => [r.status, r.count]));
    const openIssues = problemCountMap.get("open") ?? 0;
    const resolvedIssues =
      (problemCountMap.get("closed") ?? 0) + (problemCountMap.get("resolved") ?? 0);

    const recentItems = recentEvents.map((e) => ({
      id: e.id,
      type: e.type,
      payload: parsePayload(e.payload),
      timestamp: e.timestamp,
    }));

    return {
      totalEvents,
      openIssues,
      resolvedIssues,
      eventTypeCounts,
      recentEvents: recentItems,
    };
  }),

  agentMetrics: os.observability.agentMetrics.handler(async ({ input }) => {
    const range = input.range ?? "24h";
    const db = await getLocalDb();
    const rangeDate = getRangeDate(range);
    const rangeDateStr = rangeDate.toISOString();

    // SQL-level filtering: only assistant messages in time range, with row limit
    const [rangeMessages, allConversations] = await Promise.all([
      db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.role, "assistant"),
            gte(messages.createdAt, rangeDateStr),
          ),
        )
        .orderBy(desc(messages.createdAt))
        .limit(MAX_RANGE_ROWS)
        .all(),
      db.select().from(conversations).all(),
    ]);

    const convoMap = new Map(allConversations.map((c) => [c.id, c]));

    let totalToolCalls = 0;
    let successfulToolCalls = 0;
    let failedToolCalls = 0;
    let totalTokens = 0;

    for (const msg of rangeMessages) {
      const trace = parseTrace(msg.trace);
      for (const entry of trace) {
        if (entry.kind === "tool") {
          totalToolCalls++;
          if (entry.state === "completed") {
            successfulToolCalls++;
          } else if (entry.state === "failed") {
            failedToolCalls++;
          }
        }
      }
      if (msg.tokens) {
        totalTokens += Number(msg.tokens);
      }
    }

    const recentCompletions = rangeMessages.slice(0, MAX_RECENT_ITEMS).map((msg) => {
      const trace = parseTrace(msg.trace);
      const toolEntries = trace.filter((e) => e.kind === "tool");
      const convo = convoMap.get(msg.conversationId);
      return {
        conversationId: msg.conversationId,
        conversationTitle: convo?.title ?? undefined,
        agent: convo?.runtimeId ?? undefined,
        timestamp: msg.createdAt,
        tokens: msg.tokens ? Number(msg.tokens) : undefined,
        toolCalls: toolEntries.length,
        toolSuccesses: toolEntries.filter((e) => e.state === "completed").length,
      };
    });

    return {
      totalConversations: allConversations.length,
      totalMessages: rangeMessages.length,
      totalToolCalls,
      successfulToolCalls,
      failedToolCalls,
      totalTokens,
      recentCompletions,
    };
  }),

  agentTimeline: os.observability.agentTimeline.handler(async ({ input }) => {
    const range = input.range ?? "24h";
    const db = await getLocalDb();
    const rangeDate = getRangeDate(range);
    const rangeDateStr = rangeDate.toISOString();

    // SQL-level filtering: only assistant messages in time range
    const rangeMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.role, "assistant"),
          gte(messages.createdAt, rangeDateStr),
        ),
      )
      .limit(MAX_RANGE_ROWS)
      .all();

    const size = range === "24h" ? 24 : range === "7d" ? 7 : 30;
    const intervalMs =
      range === "24h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const buckets: {
      time: number;
      label: string;
      tokens: number;
      toolCalls: number;
      toolSuccesses: number;
      toolFailures: number;
    }[] = [];

    for (let i = 0; i < size; i++) {
      const bucketStart = new Date(rangeDate.getTime() + i * intervalMs);
      const bucketEnd = new Date(bucketStart.getTime() + intervalMs);

      let tokens = 0;
      let toolCalls = 0;
      let toolSuccesses = 0;
      let toolFailures = 0;

      for (const msg of rangeMessages) {
        const t = new Date(msg.createdAt).getTime();
        if (t >= bucketStart.getTime() && t < bucketEnd.getTime()) {
          if (msg.tokens) {
            tokens += Number(msg.tokens);
          }
          const trace = parseTrace(msg.trace);
          for (const entry of trace) {
            if (entry.kind === "tool") {
              toolCalls++;
              if (entry.state === "completed") {
                toolSuccesses++;
              } else if (entry.state === "failed") {
                toolFailures++;
              }
            }
          }
        }
      }

      const label =
        range === "24h"
          ? `${String(bucketStart.getHours()).padStart(2, "0")}:00`
          : `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}`;

      buckets.push({ time: i, label, tokens, toolCalls, toolSuccesses, toolFailures });
    }

    return buckets;
  }),

  activityHeatmap: os.observability.activityHeatmap.handler(async ({ input }) => {
    const range = input.range ?? "24h";
    const metric = input.metric ?? "toolCalls";
    const db = await getLocalDb();
    const rangeDate = getRangeDate(range);
    const rangeDateStr = rangeDate.toISOString();

    // SQL-level filtering: only assistant messages in time range
    const rangeMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.role, "assistant"),
          gte(messages.createdAt, rangeDateStr),
        ),
      )
      .limit(MAX_RANGE_ROWS)
      .all();

    // Initialize a 7 (days) x 24 (hours) grid
    const grid = new Map<string, number>();
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        grid.set(`${d}-${h}`, 0);
      }
    }

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (const msg of rangeMessages) {
      const dt = new Date(msg.createdAt);
      const dayOfWeek = dt.getDay(); // 0=Sun, 6=Sat
      const hour = dt.getHours();
      const key = `${dayOfWeek}-${hour}`;
      const cellValue = grid.get(key);
      if (cellValue === undefined) continue;

      switch (metric) {
        case "messages":
          grid.set(key, cellValue + 1);
          break;
        case "tokens":
          if (msg.tokens) grid.set(key, cellValue + Number(msg.tokens));
          break;
        case "toolCalls":
        default: {
          const trace = parseTrace(msg.trace);
          let tc = 0;
          for (const entry of trace) {
            if (entry.kind === "tool") tc++;
          }
          grid.set(key, cellValue + tc);
          break;
        }
      }
    }

    const result: { dayOfWeek: number; hour: number; value: number; label: string }[] = [];
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const value = grid.get(`${d}-${h}`)!;
        result.push({
          dayOfWeek: d,
          hour: h,
          value,
          label: `${dayNames[d]} ${String(h).padStart(2, "0")}:00`,
        });
      }
    }

    return result;
  }),
};
