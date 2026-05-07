import { oc } from "@orpc/contract";
import { z } from "zod";

export const customAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  apiKey: z.string(),
  model: z.string(),
  createdAt: z.string(),
});

const customAgentModelsSchema = z.object({
  models: z.array(z.string()),
});

export const customAgentsContract = {
  list: oc.input(z.object({}).optional()).output(z.array(customAgentSchema)),
  getDefault: oc
    .input(z.object({}).optional())
    .output(z.object({ agentId: z.string().nullable() })),
  setDefault: oc
    .input(z.object({ agentId: z.string().nullable() }))
    .output(z.object({ agentId: z.string().nullable() })),
  models: oc
    .input(
      z.object({
        url: z.string(),
        apiKey: z.string(),
      }),
    )
    .output(customAgentModelsSchema),
  create: oc
    .input(
      z.object({
        name: z.string(),
        url: z.string(),
        apiKey: z.string(),
        model: z.string(),
      }),
    )
    .output(z.array(customAgentSchema)),
  update: oc
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        url: z.string().optional(),
        apiKey: z.string().optional(),
        model: z.string().optional(),
      }),
    )
    .output(z.array(customAgentSchema)),
  delete: oc.input(z.object({ id: z.string() })).output(z.array(customAgentSchema)),
};
