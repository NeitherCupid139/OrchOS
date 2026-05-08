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
};
