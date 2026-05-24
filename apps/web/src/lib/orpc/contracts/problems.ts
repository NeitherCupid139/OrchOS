import { oc } from "@orpc/contract";
import { z } from "zod";

export const problemPrioritySchema = z.enum(["critical", "warning", "info"]);
export const problemStatusSchema = z.enum(["open", "fixed", "ignored", "assigned"]);

export const problemSchema = z.object({
  id: z.string(),
  title: z.string(),
  priority: problemPrioritySchema,
  source: z.string().optional(),
  context: z.string().optional(),
  status: problemStatusSchema,
  actions: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const problemSummarySchema = z.object({
  status: z.object({
    open: z.number(),
    fixed: z.number(),
    ignored: z.number(),
    assigned: z.number(),
  }),
  inbox: z.object({
    all: z.number(),
    github_pr: z.number(),
    github_issue: z.number(),
    mention: z.number(),
    agent_request: z.number(),
  }),
  system: z.object({
    critical: z.number(),
    warning: z.number(),
    info: z.number(),
  }),
});

export const problemsContract = {
  list: oc
    .input(
      z
        .object({
          status: problemStatusSchema.optional(),
          priority: problemPrioritySchema.optional(),
        })
        .optional(),
    )
    .output(z.array(problemSchema)),
  get: oc.input(z.object({ id: z.string() })).output(problemSchema.nullable()),
  counts: oc
    .input(z.object({}).optional())
    .output(
      z.object({
        open: z.number(),
        fixed: z.number(),
        ignored: z.number(),
        assigned: z.number(),
      }),
    ),
  summary: oc.input(z.object({}).optional()).output(problemSummarySchema),
  create: oc
    .input(
      z.object({
        title: z.string(),
        priority: problemPrioritySchema.optional(),
        source: z.string().optional(),
        context: z.string().optional(),
        actions: z.array(z.string()).optional(),
      }),
    )
    .output(problemSchema),
  update: oc
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        priority: problemPrioritySchema.optional(),
        status: problemStatusSchema.optional(),
        source: z.string().optional(),
        context: z.string().optional(),
      }),
    )
    .output(problemSchema.nullable()),
  delete: oc.input(z.object({ id: z.string() })).output(z.object({ success: z.boolean() })),
  bulkUpdate: oc
    .input(
      z.object({
        ids: z.array(z.string()),
        status: problemStatusSchema,
      }),
    )
    .output(z.object({ updated: z.number() })),
};
