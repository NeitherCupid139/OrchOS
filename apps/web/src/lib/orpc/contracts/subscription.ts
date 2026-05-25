import { oc } from "@orpc/contract";
import { z } from "zod";

export const subscriptionSchema = z.object({
  userId: z.string(),
  plan: z.enum(["free", "pro"]),
  creditsBalance: z.coerce.number(),
  creditsTotal: z.coerce.number(),
  tokensUsed: z.coerce.number(),
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const creditUsageItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  action: z.string(),
  tokens: z.coerce.number(),
  credits: z.coerce.number(),
  metadata: z.string(),
  createdAt: z.string(),
});

export const subscriptionContract = {
  get: oc
    .input(z.object({}).optional())
    .output(subscriptionSchema.nullable()),
  usage: oc
    .input(
      z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .output(
      z.object({
        items: z.array(creditUsageItemSchema),
        total: z.number(),
      }),
    ),
};
