import type { AppDb } from "../../db/types";
import { conversations, messages } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId } from "../../utils";
import { getRowsAffected } from "../../db/utils";
import { RuntimeService } from "../runtime/service";

export interface Conversation {
  id: string;
  title?: string;
  projectId?: string;
  agentId?: string;
  runtimeId?: string;
  archived: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  trace?: Array<
    | { kind: "message"; text: string }
    | { kind: "thought"; text: string }
    | {
        kind: "tool";
        toolName?: string;
        toolCallId?: string;
        state?: string;
        input?: unknown;
        output?: unknown;
        errorText?: string;
      }
  >;
  error?: string;
  responseTime?: number;
  executionMode?: "sandbox" | "local";
  sandboxStatus?: "created" | "reused" | "fallback" | "required_failed";
  sandboxVmId?: string;
  projectId?: string;
  projectName?: string;
  clarificationQuestions?: string[];
  tokens?: number;
  createdAt: string;
}

export abstract class ConversationService {
  static async create(
    db: AppDb,
    data: {
      title?: string;
      projectId?: string;
      agentId?: string;
      runtimeId?: string;
      archived?: boolean;
      deleted?: boolean;
    },
  ): Promise<Conversation> {
    const id = generateId("conv");
    const now = new Date().toISOString();

    await db
      .insert(conversations)
      .values({
        id,
        title: data.title || null,
        projectId: data.projectId || null,
        agentId: data.agentId || null,
        runtimeId: data.runtimeId || null,
        archived: data.archived ? "true" : "false",
        deleted: data.deleted ? "true" : "false",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return {
      id,
      title: data.title,
      projectId: data.projectId,
      agentId: data.agentId,
      runtimeId: data.runtimeId,
      archived: data.archived ?? false,
      deleted: data.deleted ?? false,
      createdAt: now,
      updatedAt: now,
    };
  }

  static async get(db: AppDb, id: string): Promise<Conversation | undefined> {
    const row = await db.select().from(conversations).where(eq(conversations.id, id)).get();
    if (!row) return undefined;
    return ConversationService.mapRow(row);
  }

  static async list(db: AppDb): Promise<Conversation[]> {
    const rows = await db.select().from(conversations).orderBy(desc(conversations.updatedAt)).all();
    return rows.map(ConversationService.mapRow);
  }

  static async update(
    db: AppDb,
    id: string,
    data: {
      title?: string;
      projectId?: string;
      agentId?: string;
      runtimeId?: string;
      archived?: boolean;
      deleted?: boolean;
    },
  ): Promise<Conversation | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.projectId !== undefined) updates.projectId = data.projectId || null;
    if (data.agentId !== undefined) updates.agentId = data.agentId || null;
    if (data.runtimeId !== undefined) updates.runtimeId = data.runtimeId || null;
    if (data.archived !== undefined) updates.archived = data.archived ? "true" : "false";
    if (data.deleted !== undefined) updates.deleted = data.deleted ? "true" : "false";
    updates.updatedAt = new Date().toISOString();

    if (Object.keys(updates).length === 1 && updates.updatedAt) {
    }

    const result = await db
      .update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .run();
    if (getRowsAffected(result) === 0) return undefined;
    return ConversationService.get(db, id);
  }

  static async delete(db: AppDb, id: string): Promise<boolean> {
    const result = await db
      .update(conversations)
      .set({ deleted: "true", archived: "false", updatedAt: new Date().toISOString() })
      .where(eq(conversations.id, id))
      .run();
    return getRowsAffected(result) > 0;
  }

  static async hardDelete(db: AppDb, id: string): Promise<boolean> {
    const result = await db.delete(conversations).where(eq(conversations.id, id)).run();
    return getRowsAffected(result) > 0;
  }

  static async clearDeleted(db: AppDb): Promise<number> {
    const result = await db.delete(conversations).where(eq(conversations.deleted, "true")).run();
    return getRowsAffected(result);
  }

  static async getMessages(db: AppDb, conversationId: string): Promise<Message[]> {
    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .all();
    return rows.map(ConversationService.mapMessageRow);
  }

  static async addMessage(
    db: AppDb,
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    error?: string,
    responseTime?: number,
    metadata?: {
      trace?: Message["trace"];
      executionMode?: Message["executionMode"];
      sandboxStatus?: Message["sandboxStatus"];
      sandboxVmId?: string;
      projectId?: string;
      projectName?: string;
      clarificationQuestions?: string[];
      tokens?: number;
    },
  ): Promise<Message> {
    const id = generateId("msg");
    const now = new Date().toISOString();

    await db
      .insert(messages)
      .values({
        id,
        conversationId,
        role,
        content,
        trace: metadata?.trace ? JSON.stringify(metadata.trace) : null,
        error: error || null,
        responseTime: responseTime != null ? String(responseTime) : null,
        executionMode: metadata?.executionMode || null,
        sandboxStatus: metadata?.sandboxStatus || null,
        sandboxVmId: metadata?.sandboxVmId || null,
        projectId: metadata?.projectId || null,
        projectName: metadata?.projectName || null,
        clarificationQuestions: metadata?.clarificationQuestions
          ? JSON.stringify(metadata.clarificationQuestions)
          : null,
        tokens: metadata?.tokens != null ? String(metadata.tokens) : null,
        createdAt: now,
      })
      .run();

    await db
      .update(conversations)
      .set({ updatedAt: now })
      .where(eq(conversations.id, conversationId))
      .run();

    return {
      id,
      conversationId,
      role,
      content,
      trace: metadata?.trace,
      error,
      responseTime,
      executionMode: metadata?.executionMode,
      sandboxStatus: metadata?.sandboxStatus,
      sandboxVmId: metadata?.sandboxVmId,
      projectId: metadata?.projectId,
      projectName: metadata?.projectName,
      clarificationQuestions: metadata?.clarificationQuestions,
      tokens: metadata?.tokens,
      createdAt: now,
    };
  }

  static async sendAndReply(
    db: AppDb,
    conversationId: string,
    userContent: string,
  ): Promise<Message> {
    const conv = await ConversationService.get(db, conversationId);
    if (!conv) throw new Error("Conversation not found");

    await ConversationService.addMessage(db, conversationId, "user", userContent);

    const runtimeId = conv.runtimeId;
    if (!runtimeId) {
      const errorMsg =
        "No runtime configured for this conversation. Please select an agent/runtime.";
      const msg = await ConversationService.addMessage(
        db,
        conversationId,
        "assistant",
        errorMsg,
        errorMsg,
      );
      return msg;
    }

    const allMessages = await ConversationService.getMessages(db, conversationId);
    const contextMessages = allMessages.slice(0, -1);

    const contextPrompt = contextMessages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const prompt = contextPrompt
      ? `${contextPrompt}\n\nUser: ${userContent}\n\nAssistant:`
      : userContent;

    try {
      const startTime = Date.now();
      const result = await RuntimeService.chat(db, runtimeId, prompt);
      const responseTime = Date.now() - startTime;

      const msg = await ConversationService.addMessage(
        db,
        conversationId,
        "assistant",
        result.output || result.error || "No response",
        result.success ? undefined : result.error,
        responseTime,
      );
      return msg;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to get response";
      const msg = await ConversationService.addMessage(
        db,
        conversationId,
        "assistant",
        errorMsg,
        errorMsg,
      );
      return msg;
    }
  }

  static mapRow(row: typeof conversations.$inferSelect): Conversation {
    return {
      id: row.id,
      title: row.title || undefined,
      projectId: row.projectId || undefined,
      agentId: row.agentId || undefined,
      runtimeId: row.runtimeId || undefined,
      archived: row.archived === "true",
      deleted: row.deleted === "true",
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static mapMessageRow(row: typeof messages.$inferSelect): Message {
    const parseJson = <T,>(value: string | null | undefined): T | undefined => {
      if (!value) return undefined;
      try {
        return JSON.parse(value) as T;
      } catch {
        return undefined;
      }
    };

    const responseTime =
      row.responseTime != null ? Number.parseInt(row.responseTime, 10) : undefined;

    return {
      id: row.id,
      conversationId: row.conversationId,
      role: row.role === "user" ? "user" : "assistant",
      content: row.content,
      trace: parseJson<Message["trace"]>(row.trace),
      error: row.error || undefined,
      responseTime: Number.isFinite(responseTime) ? responseTime : undefined,
      executionMode:
        row.executionMode === "sandbox" || row.executionMode === "local"
          ? row.executionMode
          : undefined,
      sandboxStatus:
        row.sandboxStatus === "created" ||
        row.sandboxStatus === "reused" ||
        row.sandboxStatus === "fallback" ||
        row.sandboxStatus === "required_failed"
          ? row.sandboxStatus
          : undefined,
      sandboxVmId: row.sandboxVmId || undefined,
      projectId: row.projectId || undefined,
      projectName: row.projectName || undefined,
      clarificationQuestions: parseJson<string[]>(row.clarificationQuestions),
      tokens: row.tokens != null ? Number(row.tokens) : undefined,
      createdAt: row.createdAt,
    };
  }

  static async deleteLastAssistantMessage(
    db: AppDb,
    conversationId: string,
  ): Promise<void> {
    const allMessages = await ConversationService.getMessages(db, conversationId);
    const lastAssistant = [...allMessages].reverse().find((m) => m.role === "assistant");
    if (lastAssistant) {
      await db.delete(messages).where(eq(messages.id, lastAssistant.id)).run();
    }
  }

  static async retryLastReply(
    db: AppDb,
    conversationId: string,
  ): Promise<Message> {
    const conv = await ConversationService.get(db, conversationId);
    if (!conv) throw new Error("Conversation not found");

    await ConversationService.deleteLastAssistantMessage(db, conversationId);

    const runtimeId = conv.runtimeId;
    if (!runtimeId) {
      const errorMsg =
        "No runtime configured for this conversation. Please select an agent/runtime.";
      return ConversationService.addMessage(
        db,
        conversationId,
        "assistant",
        errorMsg,
        errorMsg,
      );
    }

    const allMessages = await ConversationService.getMessages(db, conversationId);
    const contextMessages = allMessages.slice(0, -1);

    const lastUser = [...allMessages].reverse().find((m) => m.role === "user");
    const userContent = lastUser?.content ?? "";

    const contextPrompt = contextMessages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const prompt = contextPrompt
      ? `${contextPrompt}\n\nUser: ${userContent}\n\nAssistant:`
      : userContent;

    try {
      const startTime = Date.now();
      const result = await RuntimeService.chat(db, runtimeId, prompt);
      const responseTime = Date.now() - startTime;

      return ConversationService.addMessage(
        db,
        conversationId,
        "assistant",
        result.output || result.error || "No response",
        result.success ? undefined : result.error,
        responseTime,
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to get response";
      return ConversationService.addMessage(
        db,
        conversationId,
        "assistant",
        errorMsg,
        errorMsg,
      );
    }
  }

}
