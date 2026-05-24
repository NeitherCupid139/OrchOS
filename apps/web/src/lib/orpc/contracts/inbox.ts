import { oc } from "@orpc/contract";
import { z } from "zod";

export const inboxThreadKindSchema = z.enum([
  "agent_request",
  "pull_request",
  "issue",
  "mention",
  "system_alert",
]);

export const inboxThreadStatusSchema = z.enum([
  "open",
  "in_progress",
  "blocked",
  "waiting_user",
  "completed",
  "dismissed",
]);

export const inboxPrioritySchema = z.enum(["critical", "warning", "info"]);

export const inboxMessageTypeSchema = z.enum([
  "request",
  "status_update",
  "question",
  "blocker",
  "artifact",
  "review_request",
  "completion",
  "system_note",
]);

export const inboxThreadSchema = z.object({
  id: z.string(),
  kind: inboxThreadKindSchema,
  status: inboxThreadStatusSchema,
  priority: inboxPrioritySchema,
  title: z.string(),
  summary: z.string().optional(),
  projectId: z.string().optional(),
  conversationId: z.string().optional(),
  createdByType: z.enum(["user", "agent", "system"]),
  createdById: z.string().optional(),
  createdByName: z.string(),
  lastMessageAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archived: z.boolean(),
});

export const inboxMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  messageType: inboxMessageTypeSchema,
  senderType: z.enum(["user", "agent", "system"]),
  senderId: z.string().optional(),
  senderName: z.string(),
  subject: z.string().optional(),
  body: z.string(),
  to: z.array(z.string()),
  cc: z.array(z.string()),
  problemId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

export const inboxContract = {
  listThreads: oc
    .input(
      z
        .object({
          kind: inboxThreadKindSchema.optional(),
          status: inboxThreadStatusSchema.optional(),
          projectId: z.string().optional(),
          conversationId: z.string().optional(),
        })
        .optional(),
    )
    .output(z.array(inboxThreadSchema)),
  getThread: oc.input(z.object({ id: z.string() })).output(inboxThreadSchema.nullable()),
  updateThread: oc
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        summary: z.string().optional(),
        status: inboxThreadStatusSchema.optional(),
        priority: inboxPrioritySchema.optional(),
        archived: z.boolean().optional(),
      }),
    )
    .output(inboxThreadSchema.nullable()),
  listMessages: oc.input(z.object({ threadId: z.string() })).output(z.array(inboxMessageSchema)),
  addMessage: oc
    .input(
      z.object({
        threadId: z.string(),
        messageType: inboxMessageTypeSchema,
        senderType: z.enum(["user", "agent", "system"]),
        senderId: z.string().optional(),
        senderName: z.string(),
        subject: z.string().optional(),
        body: z.string(),
        to: z.array(z.string()).optional(),
        cc: z.array(z.string()).optional(),
        problemId: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .output(inboxMessageSchema),
};
