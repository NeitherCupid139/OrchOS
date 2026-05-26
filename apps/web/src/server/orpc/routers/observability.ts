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

function parseTrace(
  trace: string | null,
): Array<{ kind: string; state?: string }> {
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

    const size = range === "24h" ? 24 : range === "7d" ? 7 : 30;
    const intervalMs = range === "24h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const intervalFmt =
      range === "24h" ? "%Y-%m-%d %H:00:00" : "%Y-%m-%d 00:00:00";

    // SQL GROUP BY: aggregate events and problems into time buckets
    const [eventBuckets, problemBuckets] = await Promise.all([
      db
        .select({
          bucket: sql<string>`strftime(${intervalFmt}, ${events.timestamp})`,
          count: sql<number>`count(*)`,
        })
        .from(events)
        .where(gte(events.timestamp, rangeDateStr))
        .groupBy(sql`strftime(${intervalFmt}, ${events.timestamp})`)
        .all(),
      db
        .select({
          bucket: sql<string>`strftime(${intervalFmt}, ${problems.createdAt})`,
          count: sql<number>`count(*)`,
        })
        .from(problems)
        .where(gte(problems.createdAt, rangeDateStr))
        .groupBy(sql`strftime(${intervalFmt}, ${problems.createdAt})`)
        .all(),
    ]);

    const eventMap = new Map(eventBuckets.map((b) => [b.bucket, b.count]));
    const problemMap = new Map(problemBuckets.map((b) => [b.bucket, b.count]));

    // Generate all expected buckets and fill in gaps (at most 30 iterations)
    const buckets: {
      time: number;
      label: string;
      events: number;
      issues: number;
    }[] = [];
    for (let i = 0; i < size; i++) {
      const bucketStart = new Date(rangeDate.getTime() + i * intervalMs);
      const y = bucketStart.getFullYear();
      const m = String(bucketStart.getMonth() + 1).padStart(2, "0");
      const d = String(bucketStart.getDate()).padStart(2, "0");
      const h = String(bucketStart.getHours()).padStart(2, "0");

      const bucketKey =
        range === "24h"
          ? `${y}-${m}-${d} ${h}:00:00`
          : `${y}-${m}-${d} 00:00:00`;

      const label =
        range === "24h"
          ? `${h}:00`
          : `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}`;

      buckets.push({
        time: i,
        label,
        events: eventMap.get(bucketKey) ?? 0,
        issues: problemMap.get(bucketKey) ?? 0,
      });
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

    const problemCountMap = new Map(
      problemCountRows.map((r) => [r.status, r.count]),
    );
    const openIssues = problemCountMap.get("open") ?? 0;
    const resolvedIssues =
      (problemCountMap.get("closed") ?? 0) +
      (problemCountMap.get("resolved") ?? 0);

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

    const recentCompletions = rangeMessages
      .slice(0, MAX_RECENT_ITEMS)
      .map((msg) => {
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
          toolSuccesses: toolEntries.filter((e) => e.state === "completed")
            .length,
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

    const size = range === "24h" ? 24 : range === "7d" ? 7 : 30;
    const intervalMs = range === "24h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const intervalFmt =
      range === "24h" ? "%Y-%m-%d %H:00:00" : "%Y-%m-%d 00:00:00";

    // SQL GROUP BY: aggregate tokens and message count per time bucket
    const bucketedMessages = await db
      .select({
        bucket: sql<string>`strftime(${intervalFmt}, ${messages.createdAt})`,
        tokens: sql<number>`coalesce(sum(${messages.tokens}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .where(
        and(
          eq(messages.role, "assistant"),
          gte(messages.createdAt, rangeDateStr),
        ),
      )
      .groupBy(sql`strftime(${intervalFmt}, ${messages.createdAt})`)
      .all();

    const tokenMap = new Map(
      bucketedMessages.map((b) => [b.bucket, Number(b.tokens)]),
    );

    // For tool call stats (requires JSON trace parsing), load only needed
    // fields and bucket in a single pass using a Map (O(N) not O(N*size))
    const toolMessages = await db
      .select({ createdAt: messages.createdAt, trace: messages.trace })
      .from(messages)
      .where(
        and(
          eq(messages.role, "assistant"),
          gte(messages.createdAt, rangeDateStr),
        ),
      )
      .limit(MAX_RANGE_ROWS)
      .all();

    const toolStatsByBucket = new Map<
      string,
      { toolCalls: number; toolSuccesses: number; toolFailures: number }
    >();

    for (const msg of toolMessages) {
      const dt = new Date(msg.createdAt);
      const y = dt.getFullYear();
      const mon = String(dt.getMonth() + 1).padStart(2, "0");
      const day = String(dt.getDate()).padStart(2, "0");
      const hour = String(dt.getHours()).padStart(2, "0");
      const key =
        range === "24h"
          ? `${y}-${mon}-${day} ${hour}:00:00`
          : `${y}-${mon}-${day} 00:00:00`;

      let entry = toolStatsByBucket.get(key);
      if (!entry) {
        entry = { toolCalls: 0, toolSuccesses: 0, toolFailures: 0 };
        toolStatsByBucket.set(key, entry);
      }

      const trace = parseTrace(msg.trace);
      for (const traceEntry of trace) {
        if (traceEntry.kind === "tool") {
          entry.toolCalls++;
          if (traceEntry.state === "completed") entry.toolSuccesses++;
          else if (traceEntry.state === "failed") entry.toolFailures++;
        }
      }
    }

    // Fill in output array (at most 30 iterations)
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
      const y = bucketStart.getFullYear();
      const m = String(bucketStart.getMonth() + 1).padStart(2, "0");
      const d = String(bucketStart.getDate()).padStart(2, "0");
      const h = String(bucketStart.getHours()).padStart(2, "0");

      const bucketKey =
        range === "24h"
          ? `${y}-${m}-${d} ${h}:00:00`
          : `${y}-${m}-${d} 00:00:00`;

      const label =
        range === "24h"
          ? `${h}:00`
          : `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}`;

      const toolStats = toolStatsByBucket.get(bucketKey);

      buckets.push({
        time: i,
        label,
        tokens: tokenMap.get(bucketKey) ?? 0,
        toolCalls: toolStats?.toolCalls ?? 0,
        toolSuccesses: toolStats?.toolSuccesses ?? 0,
        toolFailures: toolStats?.toolFailures ?? 0,
      });
    }

    return buckets;
  }),

  activityHeatmap: os.observability.activityHeatmap.handler(
    async ({ input }) => {
      const range = input.range ?? "24h";
      const metric = input.metric ?? "toolCalls";
      const db = await getLocalDb();
      const rangeDate = getRangeDate(range);
      const rangeDateStr = rangeDate.toISOString();

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      // For "messages" and "tokens" metrics, use SQL GROUP BY with strftime
      if (metric === "messages" || metric === "tokens") {
        const heatmapRows = await db
          .select({
            dayOfWeek: sql<number>`cast(strftime('%w', ${messages.createdAt}) as integer)`,
            hour: sql<number>`cast(strftime('%H', ${messages.createdAt}) as integer)`,
            count: sql<number>`count(*)`,
            tokens: sql<number>`coalesce(sum(${messages.tokens}), 0)`,
          })
          .from(messages)
          .where(
            and(
              eq(messages.role, "assistant"),
              gte(messages.createdAt, rangeDateStr),
            ),
          )
          .groupBy(
            sql`strftime('%w', ${messages.createdAt})`,
            sql`strftime('%H', ${messages.createdAt})`,
          )
          .all();

        const heatmapMap = new Map(
          heatmapRows.map((r) => [
            `${r.dayOfWeek}-${r.hour}`,
            metric === "tokens" ? Number(r.tokens) : r.count,
          ]),
        );

        const result: {
          dayOfWeek: number;
          hour: number;
          value: number;
          label: string;
        }[] = [];
        for (let d = 0; d < 7; d++) {
          for (let h = 0; h < 24; h++) {
            result.push({
              dayOfWeek: d,
              hour: h,
              value: heatmapMap.get(`${d}-${h}`) ?? 0,
              label: `${dayNames[d]} ${String(h).padStart(2, "0")}:00`,
            });
          }
        }
        return result;
      }

      // For "toolCalls" metric, load only needed fields and bucket
      // in a single JS pass to avoid loading all message content
      const toolMessages = await db
        .select({ createdAt: messages.createdAt, trace: messages.trace })
        .from(messages)
        .where(
          and(
            eq(messages.role, "assistant"),
            gte(messages.createdAt, rangeDateStr),
          ),
        )
        .limit(MAX_RANGE_ROWS)
        .all();

      const grid = new Map<string, number>();
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          grid.set(`${d}-${h}`, 0);
        }
      }

      for (const msg of toolMessages) {
        const dt = new Date(msg.createdAt);
        const dayOfWeek = dt.getDay();
        const hour = dt.getHours();
        const key = `${dayOfWeek}-${hour}`;
        const cellValue = grid.get(key);
        if (cellValue === undefined) continue;

        const trace = parseTrace(msg.trace);
        let tc = 0;
        for (const entry of trace) {
          if (entry.kind === "tool") tc++;
        }
        grid.set(key, cellValue + tc);
      }

      const result: {
        dayOfWeek: number;
        hour: number;
        value: number;
        label: string;
      }[] = [];
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
    },
  ),
};
