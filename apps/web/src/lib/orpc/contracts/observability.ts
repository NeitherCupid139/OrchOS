import { oc } from "@orpc/contract";
import { z } from "zod";

export const observabilityRangeSchema = z.enum(["24h", "7d", "30d"]);

export const eventTypeCountSchema = z.object({
  type: z.string(),
  count: z.number(),
});

export const timeSeriesPointSchema = z.object({
  time: z.number(),
  label: z.string(),
  events: z.number(),
  issues: z.number(),
});

export const activityHeatmapPointSchema = z.object({
  dayOfWeek: z.number(),
  hour: z.number(),
  value: z.number(),
  label: z.string(),
});

export const agentTimelinePointSchema = z.object({
  time: z.number(),
  label: z.string(),
  tokens: z.number(),
  toolCalls: z.number(),
  toolSuccesses: z.number(),
  toolFailures: z.number(),
});

export const eventSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.string(),
});

export const observabilityMetricsSchema = z.object({
  totalEvents: z.number(),
  openIssues: z.number(),
  resolvedIssues: z.number(),
  eventTypeCounts: z.array(eventTypeCountSchema),
  recentEvents: z.array(eventSchema),
});

export const agentMetricsSchema = z.object({
  totalConversations: z.number(),
  totalMessages: z.number(),
  totalToolCalls: z.number(),
  successfulToolCalls: z.number(),
  failedToolCalls: z.number(),
  totalTokens: z.number(),
  recentCompletions: z.array(z.object({
    conversationId: z.string(),
    conversationTitle: z.string().optional(),
    agent: z.string().optional(),
    timestamp: z.string(),
    tokens: z.number().optional(),
    toolCalls: z.number(),
    toolSuccesses: z.number(),
  })),
});

export const observabilityContract = {
  throughput: oc
    .input(
      z.object({
        range: observabilityRangeSchema.optional(),
      }),
    )
    .output(z.array(timeSeriesPointSchema)),
  metrics: oc
    .input(
      z.object({
        range: observabilityRangeSchema.optional(),
      }),
    )
    .output(observabilityMetricsSchema),
  agentMetrics: oc
    .input(
      z.object({
        range: observabilityRangeSchema.optional(),
      }),
    )
    .output(agentMetricsSchema),
  agentTimeline: oc
    .input(
      z.object({
        range: observabilityRangeSchema.optional(),
      }),
    )
    .output(z.array(agentTimelinePointSchema)),
  activityHeatmap: oc
    .input(
      z.object({
        range: observabilityRangeSchema.optional(),
        metric: z.enum(["messages", "toolCalls", "tokens"]).optional(),
      }),
    )
    .output(z.array(activityHeatmapPointSchema)),
};
