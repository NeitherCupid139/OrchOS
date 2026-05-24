import { oc } from "@orpc/contract";
import { z } from "zod";

const runtimeTraceEventSchema = z.union([
  z.object({
    kind: z.literal("message"),
    text: z.string(),
  }),
  z.object({
    kind: z.literal("thought"),
    text: z.string(),
  }),
  z.object({
    kind: z.literal("tool"),
    toolName: z.string().optional(),
    toolCallId: z.string().optional(),
    state: z.string().optional(),
    input: z.unknown().optional(),
    output: z.unknown().optional(),
    errorText: z.string().optional(),
  }),
]);

export const conversationSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  projectId: z.string().optional(),
  agentId: z.string().optional(),
  runtimeId: z.string().optional(),
  archived: z.boolean(),
  deleted: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const conversationMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  trace: z.array(runtimeTraceEventSchema).optional(),
  error: z.string().optional(),
  responseTime: z.number().optional(),
  executionMode: z.enum(["sandbox", "local"]).optional(),
  sandboxStatus: z.enum(["created", "reused", "fallback", "required_failed"]).optional(),
  sandboxVmId: z.string().optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  clarificationQuestions: z.array(z.string()).optional(),
  createdAt: z.string(),
});

export const conversationsContract = {
  list: oc.input(z.object({}).optional()).output(z.array(conversationSchema)),
  get: oc.input(z.object({ id: z.string() })).output(conversationSchema.nullable()),
  create: oc
    .input(
      z.object({
        title: z.string().optional(),
        projectId: z.string().optional(),
        runtimeId: z.string().optional(),
        archived: z.boolean().optional(),
        deleted: z.boolean().optional(),
      }),
    )
    .output(conversationSchema),
  update: oc
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        projectId: z.string().optional(),
        runtimeId: z.string().optional(),
        archived: z.boolean().optional(),
        deleted: z.boolean().optional(),
      }),
    )
    .output(conversationSchema.nullable()),
  delete: oc
    .input(
      z.object({
        id: z.string(),
        permanent: z.boolean().optional(),
      }),
    )
    .output(z.object({ success: z.boolean() })),
  clearDeleted: oc.input(z.object({}).optional()).output(
    z.object({
      success: z.boolean(),
      count: z.number(),
    }),
  ),
  listMessages: oc.input(z.object({ id: z.string() })).output(z.array(conversationMessageSchema)),
  sendMessage: oc
    .input(
      z.object({
        id: z.string(),
        content: z.string(),
        customAgentId: z.string().optional(),
      }),
    )
    .output(conversationMessageSchema),
  retryMessage: oc
    .input(
      z.object({
        id: z.string(),
        customAgentId: z.string().optional(),
      }),
    )
    .output(conversationMessageSchema),
};
