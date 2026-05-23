import type { AppDb } from "../../db/types";
import { problems } from "../../db/schema";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { generateId } from "../../utils";
import { getRowsAffected } from "../../db/utils";

export type ProblemPriority = "critical" | "warning" | "info";
export type ProblemStatus = "open" | "fixed" | "ignored" | "assigned";
export type ProblemSummary = {
  status: Record<ProblemStatus, number>;
  inbox: {
    all: number;
    github_pr: number;
    github_issue: number;
    mention: number;
    agent_request: number;
  };
  system: {
    critical: number;
    warning: number;
    info: number;
  };
};

export interface Problem {
  id: string;
  title: string;
  priority: ProblemPriority;
  source?: string;
  context?: string;
  goalId?: string;
  stateId?: string;
  status: ProblemStatus;
  actions: string[];
  createdAt: string;
  updatedAt: string;
}

interface CreateProblemData {
  title: string;
  priority?: ProblemPriority;
  source?: string;
  context?: string;
  goalId?: string;
  stateId?: string;
  actions?: string[];
}

export const ProblemService = {
  async list(
    db: AppDb,
    filters?: { status?: ProblemStatus; priority?: ProblemPriority },
  ): Promise<Problem[]> {
    let query = db.select().from(problems).orderBy(desc(problems.createdAt));
    const conditions = [];
    if (filters?.status) conditions.push(eq(problems.status, filters.status));
    if (filters?.priority) conditions.push(eq(problems.priority, filters.priority));
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    const rows = await query.all();
    return rows.map((row) => ({
      ...row,
      source: row.source ?? undefined,
      context: row.context ?? undefined,
      goalId: row.goalId ?? undefined,
      stateId: row.stateId ?? undefined,
      priority: row.priority as ProblemPriority,
      status: row.status as ProblemStatus,
      actions: JSON.parse(row.actions || "[]"),
    }));
  },

  async get(db: AppDb, id: string): Promise<Problem | null> {
    const row = await db.select().from(problems).where(eq(problems.id, id)).get();
    if (!row) return null;
    return {
      ...row,
      source: row.source ?? undefined,
      context: row.context ?? undefined,
      goalId: row.goalId ?? undefined,
      stateId: row.stateId ?? undefined,
      priority: row.priority as ProblemPriority,
      status: row.status as ProblemStatus,
      actions: JSON.parse(row.actions || "[]"),
    };
  },

  async create(db: AppDb, data: CreateProblemData): Promise<Problem> {
    const now = new Date().toISOString();
    const id = generateId();
    const problem: Record<string, unknown> = {
      id,
      title: data.title,
      priority: data.priority || "warning",
      status: "open",
      actions: JSON.stringify(data.actions || []),
      createdAt: now,
      updatedAt: now,
    };
    if (data.source) problem.source = data.source;
    if (data.context) problem.context = data.context;
    if (data.goalId) problem.goalId = data.goalId;
    if (data.stateId) problem.stateId = data.stateId;
    await db
      .insert(problems)
      .values(problem as any)
      .run();
    return {
      ...problem,
      actions: data.actions || [],
      status: "open",
    } as Problem;
  },

  async update(
    db: AppDb,
    id: string,
    data: Partial<Pick<Problem, "title" | "priority" | "status" | "source" | "context">>,
  ): Promise<Problem | null> {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updatedAt: now };
    if (data.title !== undefined) updates.title = data.title;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.status !== undefined) updates.status = data.status;
    if (data.source !== undefined) updates.source = data.source;
    if (data.context !== undefined) updates.context = data.context;
    await db.update(problems).set(updates).where(eq(problems.id, id)).run();
    return ProblemService.get(db, id);
  },

  async delete(db: AppDb, id: string): Promise<boolean> {
    const result = await db.delete(problems).where(eq(problems.id, id)).run();
    return getRowsAffected(result) > 0;
  },

  async bulkUpdate(
    db: AppDb,
    ids: string[],
    data: Partial<Pick<Problem, "status">>,
  ): Promise<number> {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updatedAt: now };
    if (data.status !== undefined) updates.status = data.status;
    const result = await db.update(problems).set(updates).where(inArray(problems.id, ids)).run();
    return getRowsAffected(result);
  },

  async countByStatus(db: AppDb): Promise<Record<ProblemStatus, number>> {
    const rows = await db
      .select({
        status: problems.status,
        count: sql<number>`count(*)`,
      })
      .from(problems)
      .groupBy(problems.status)
      .all();

    const counts: Record<string, number> = {
      open: 0,
      fixed: 0,
      ignored: 0,
      assigned: 0,
    };
    for (const row of rows) {
      if (row.status in counts) {
        counts[row.status] = row.count;
      }
    }
    return counts as Record<ProblemStatus, number>;
  },

  async summarize(db: AppDb): Promise<ProblemSummary> {
    const inboxSources = ["github_pr", "github_issue", "mention", "agent_request"];

    const rows = await db
      .select({
        open: sql<number>`sum(case when ${problems.status} = 'open' then 1 else 0 end)`,
        fixed: sql<number>`sum(case when ${problems.status} = 'fixed' then 1 else 0 end)`,
        ignored: sql<number>`sum(case when ${problems.status} = 'ignored' then 1 else 0 end)`,
        assigned: sql<number>`sum(case when ${problems.status} = 'assigned' then 1 else 0 end)`,
        inboxAll:
          sql<number>`sum(case when ${problems.status} = 'open' and ${problems.source} in ('${sql.raw(inboxSources.join("','"))}') then 1 else 0 end)`,
        inboxGithubPr:
          sql<number>`sum(case when ${problems.status} = 'open' and ${problems.source} = 'github_pr' then 1 else 0 end)`,
        inboxGithubIssue:
          sql<number>`sum(case when ${problems.status} = 'open' and ${problems.source} = 'github_issue' then 1 else 0 end)`,
        inboxMention:
          sql<number>`sum(case when ${problems.status} = 'open' and ${problems.source} = 'mention' then 1 else 0 end)`,
        inboxAgentRequest:
          sql<number>`sum(case when ${problems.status} = 'open' and ${problems.source} = 'agent_request' then 1 else 0 end)`,
        systemCritical:
          sql<number>`sum(case when ${problems.status} = 'open' and (${problems.source} is null or ${problems.source} not in ('${sql.raw(inboxSources.join("','"))}')) and ${problems.priority} = 'critical' then 1 else 0 end)`,
        systemWarning:
          sql<number>`sum(case when ${problems.status} = 'open' and (${problems.source} is null or ${problems.source} not in ('${sql.raw(inboxSources.join("','"))}')) and ${problems.priority} = 'warning' then 1 else 0 end)`,
        systemInfo:
          sql<number>`sum(case when ${problems.status} = 'open' and (${problems.source} is null or ${problems.source} not in ('${sql.raw(inboxSources.join("','"))}')) and ${problems.priority} = 'info' then 1 else 0 end)`,
      })
      .from(problems)
      .all();

    const row = rows[0];
    return {
      status: {
        open: row?.open ?? 0,
        fixed: row?.fixed ?? 0,
        ignored: row?.ignored ?? 0,
        assigned: row?.assigned ?? 0,
      },
      inbox: {
        all: row?.inboxAll ?? 0,
        github_pr: row?.inboxGithubPr ?? 0,
        github_issue: row?.inboxGithubIssue ?? 0,
        mention: row?.inboxMention ?? 0,
        agent_request: row?.inboxAgentRequest ?? 0,
      },
      system: {
        critical: row?.systemCritical ?? 0,
        warning: row?.systemWarning ?? 0,
        info: row?.systemInfo ?? 0,
      },
    };
  },
};
