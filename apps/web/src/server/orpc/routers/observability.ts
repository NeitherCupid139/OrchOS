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
  agentMetrics: os.observability.agentMetrics.handler(async ({ input }) => {
    const range = input.range ?? "24h";
    const db = await getLocalDb();
    const rangeDate = getRangeDate(range);

    const allMessages = await db.select().from(messages).all();
    const allConversations = await db.select().from(conversations).all();

    const convoMap = new Map(allConversations.map((c) => [c.id, c]));

    const filteredMessages = allMessages.filter(
      (m) => m.role === "assistant" && new Date(m.createdAt) >= rangeDate,
    );

    let totalToolCalls = 0;
    let successfulToolCalls = 0;
    let failedToolCalls = 0;
    let totalTokens = 0;

    for (const msg of filteredMessages) {
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

    const recentCompletions = filteredMessages
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)
      .map((msg) => {
        const trace = parseTrace(msg.trace);
        const toolEntries = trace.filter((e) => e.kind === "tool");
        const convo = convoMap.get(msg.conversationId);
        return {
          conversationId: msg.conversationId,
          conversationTitle: convo?.title ?? undefined,
          agent: convo?.agentId ?? convo?.runtimeId ?? undefined,
          timestamp: msg.createdAt,
          tokens: msg.tokens ? Number(msg.tokens) : undefined,
          toolCalls: toolEntries.length,
          toolSuccesses: toolEntries.filter((e) => e.state === "completed").length,
        };
      });

    return {
      totalConversations: allConversations.length,
      totalMessages: filteredMessages.length,
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

    const allMessages = await db.select().from(messages).all();

    const filteredMessages = allMessages.filter(
      (m) => m.role === "assistant" && new Date(m.createdAt) >= rangeDate,
    );

    const size = range === "24h" ? 24 : range === "7d" ? 7 : 30;
    const intervalMs = range === "24h"
      ? 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    const buckets: { time: number; label: string; tokens: number; toolCalls: number; toolSuccesses: number; toolFailures: number }[] = [];
    for (let i = 0; i < size; i++) {
      const bucketStart = new Date(rangeDate.getTime() + i * intervalMs);
      const bucketEnd = new Date(bucketStart.getTime() + intervalMs);

      let tokens = 0;
      let toolCalls = 0;
      let toolSuccesses = 0;
      let toolFailures = 0;

      for (const msg of filteredMessages) {
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

      const label = range === "24h"
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

    const allMessages = await db.select().from(messages).all();

    const filteredMessages = allMessages.filter(
      (m) => m.role === "assistant" && new Date(m.createdAt) >= rangeDate,
    );

    // Initialize a 7 (days) x 24 (hours) grid
    const grid = new Map<string, { value: number }>();
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        grid.set(`${d}-${h}`, { value: 0 });
      }
    }

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (const msg of filteredMessages) {
      const dt = new Date(msg.createdAt);
      const dayOfWeek = dt.getDay(); // 0=Sun, 6=Sat
      const hour = dt.getHours();
      const key = `${dayOfWeek}-${hour}`;
      const cell = grid.get(key);
      if (!cell) continue;

      switch (metric) {
        case "messages":
          cell.value += 1;
          break;
        case "tokens":
          if (msg.tokens) cell.value += Number(msg.tokens);
          break;
        case "toolCalls":
        default: {
          const trace = parseTrace(msg.trace);
          for (const entry of trace) {
            if (entry.kind === "tool") cell.value += 1;
          }
          break;
        }
      }
    }

    const result: { dayOfWeek: number; hour: number; value: number; label: string }[] = [];
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const cell = grid.get(`${d}-${h}`)!;
        result.push({
          dayOfWeek: d,
          hour: h,
          value: cell.value,
          label: `${dayNames[d]} ${String(h).padStart(2, "0")}:00`,
        });
      }
    }

    return result;
  }),
};

function parsePayload(payload: string): Record<string, unknown> {
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}
