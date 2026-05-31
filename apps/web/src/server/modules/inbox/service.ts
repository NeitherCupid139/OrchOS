import type { AppDb } from "../../db/types";
import { problems } from "../../db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { generateId } from "../../utils";

export type InboxThreadKind =
  | "agent_request"
  | "pull_request"
  | "issue"
  | "mention"
  | "system_alert";

export type InboxThreadStatus =
  | "open"
  | "in_progress"
  | "blocked"
  | "waiting_user"
  | "completed"
  | "dismissed";

export type InboxPriority = "critical" | "warning" | "info";

export type InboxMessageType =
  | "request"
  | "status_update"
  | "question"
  | "blocker"
  | "artifact"
  | "review_request"
  | "completion"
  | "system_note";

export interface InboxThread {
  id: string;
  kind: InboxThreadKind;
  status: InboxThreadStatus;
  priority: InboxPriority;
  title: string;
  summary?: string;
  projectId?: string;
  conversationId?: string;
  commandId?: string;
  primaryGoalId?: string;
  createdByType: "user" | "agent" | "system";
  createdById?: string;
  createdByName: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface InboxMessage {
  id: string;
  threadId: string;
  messageType: InboxMessageType;
  senderType: "user" | "agent" | "system";
  senderId?: string;
  senderName: string;
  subject?: string;
  body: string;
  to: string[];
  cc: string[];
  problemId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface ListThreadsFilters {
  kind?: InboxThreadKind;
  status?: InboxThreadStatus;
  projectId?: string;
  conversationId?: string;
}

const SOURCE_TO_KIND: Record<string, InboxThreadKind> = {
  github_pr: "pull_request",
  github_issue: "issue",
  mention: "mention",
  agent_request: "agent_request",
};

const INBOX_SOURCES = Object.keys(SOURCE_TO_KIND);

function problemToThread(row: Record<string, unknown>): InboxThread {
  const source = (row.source as string) ?? "";
  const kind = SOURCE_TO_KIND[source] ?? "system_alert";
  const problemStatus = row.status as string;

  let threadStatus: InboxThreadStatus = "open";
  if (problemStatus === "assigned") threadStatus = "in_progress";
  else if (problemStatus === "fixed") threadStatus = "completed";
  else if (problemStatus === "ignored") threadStatus = "dismissed";

  const now = new Date().toISOString();

  return {
    id: row.id as string,
    kind,
    status: threadStatus,
    priority: (row.priority as InboxPriority) ?? "warning",
    title: row.title as string,
    summary: (row.context as string) ?? undefined,
    primaryGoalId: (row.goalId as string) ?? undefined,
    createdByType: "system",
    createdByName: "System",
    lastMessageAt: (row.updatedAt as string) ?? now,
    createdAt: (row.createdAt as string) ?? now,
    updatedAt: (row.updatedAt as string) ?? now,
    archived: false,
  };
}

const INBOX_LIST_LIMIT = 500;

export const InboxService = {
  async list(db: AppDb, filters?: ListThreadsFilters): Promise<InboxThread[]> {
    const conditions = [
      inArray(problems.source, INBOX_SOURCES),
      eq(problems.status, "open"),
    ];

    if (filters?.kind) {
      const sourceName = Object.entries(SOURCE_TO_KIND).find(
        ([, v]) => v === filters.kind,
      )?.[0];
      if (sourceName) {
        conditions.push(eq(problems.source, sourceName));
      }
    }
    if (filters?.status) {
      if (filters.status === "open") {
        conditions.push(eq(problems.status, "open"));
      }
    }

    const rows = await db
      .select()
      .from(problems)
      .where(and(...conditions))
      .orderBy(desc(problems.createdAt))
      .limit(INBOX_LIST_LIMIT)
      .all();

    return rows.map((row) =>
      problemToThread({
        ...row,
        priority: row.priority,
        status: row.status,
        actions: row.actions,
      }),
    );
  },

  async get(db: AppDb, id: string): Promise<InboxThread | null> {
    const row = await db
      .select()
      .from(problems)
      .where(and(eq(problems.id, id), inArray(problems.source, INBOX_SOURCES)))
      .get();

    if (!row) return null;

    return problemToThread({
      ...row,
      priority: row.priority,
      status: row.status,
    });
  },

  async update(
    db: AppDb,
    id: string,
    data: {
      title?: string;
      summary?: string;
      status?: InboxThreadStatus;
      priority?: InboxPriority;
      archived?: boolean;
    },
  ): Promise<InboxThread | null> {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updatedAt: now };

    if (data.title !== undefined) updates.title = data.title;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.summary !== undefined) updates.context = data.summary;

    if (data.status !== undefined) {
      const statusMap: Record<InboxThreadStatus, string> = {
        open: "open",
        in_progress: "assigned",
        blocked: "open",
        waiting_user: "open",
        completed: "fixed",
        dismissed: "ignored",
      };
      updates.status = statusMap[data.status] ?? "open";
    }

    await db.update(problems).set(updates).where(eq(problems.id, id)).run();
    return InboxService.get(db, id);
  },

  async listMessages(_db: AppDb, _threadId: string): Promise<InboxMessage[]> {
    return [];
  },

  async addMessage(
    _db: AppDb,
    threadId: string,
    data: {
      messageType: InboxMessageType;
      senderType: "user" | "agent" | "system";
      senderId?: string;
      senderName: string;
      subject?: string;
      body: string;
      to?: string[];
      cc?: string[];
      problemId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<InboxMessage> {
    const now = new Date().toISOString();
    const id = generateId("msg");

    const message: InboxMessage = {
      id,
      threadId,
      messageType: data.messageType,
      senderType: data.senderType,
      senderId: data.senderId,
      senderName: data.senderName,
      subject: data.subject,
      body: data.body,
      to: data.to ?? [],
      cc: data.cc ?? [],
      createdAt: now,
    };

    return message;
  },
};
