import type { ConversationMessage, InboxThread } from "./api.types";
import { isRecord, readString } from "./api.shared";

export function normalizeTrace(trace: unknown): ConversationMessage["trace"] {
  if (!Array.isArray(trace)) return undefined;

  const result: NonNullable<ConversationMessage["trace"]> = [];
  for (const item of trace) {
    if (!isRecord(item) || typeof item.kind !== "string") continue;

    if (item.kind === "message" || item.kind === "thought") {
      result.push({
        kind: item.kind,
        text: readString(item.text) ?? "",
      });
      continue;
    }

    if (item.kind === "tool") {
      result.push({
        kind: "tool" as const,
        toolName: readString(item.toolName),
        toolCallId: readString(item.toolCallId),
        state: readString(item.state),
        input: item.input,
        output: item.output,
        errorText: readString(item.errorText),
      });
    }
  }
  return result.length > 0 ? result : undefined;
}

export function normalizeConversationMessage(
  message: unknown,
): ConversationMessage {
  const record = isRecord(message) ? message : {};

  return {
    id: readString(record.id) ?? "",
    conversationId: readString(record.conversationId) ?? "",
    role: record.role === "user" ? "user" : "assistant",
    content: readString(record.content) ?? "",
    trace: normalizeTrace(record.trace),
    error: readString(record.error),
    responseTime:
      typeof record.responseTime === "number" ? record.responseTime : undefined,
    executionMode:
      record.executionMode === "sandbox" || record.executionMode === "local"
        ? record.executionMode
        : undefined,
    sandboxStatus:
      record.sandboxStatus === "created" ||
      record.sandboxStatus === "reused" ||
      record.sandboxStatus === "fallback" ||
      record.sandboxStatus === "required_failed"
        ? record.sandboxStatus
        : undefined,
    sandboxVmId: readString(record.sandboxVmId),
    projectId: readString(record.projectId),
    projectName: readString(record.projectName),
    clarificationQuestions: Array.isArray(record.clarificationQuestions)
      ? record.clarificationQuestions.map((item) => String(item))
      : undefined,
    createdAt: readString(record.createdAt) ?? new Date(0).toISOString(),
  };
}

export function normalizeInboxThread(thread: unknown): InboxThread {
  const record = isRecord(thread) ? thread : {};

  return {
    id: readString(record.id) ?? "",
    kind:
      record.kind === "agent_request" ||
      record.kind === "pull_request" ||
      record.kind === "issue" ||
      record.kind === "mention" ||
      record.kind === "system_alert"
        ? record.kind
        : "agent_request",
    status:
      record.status === "open" ||
      record.status === "in_progress" ||
      record.status === "blocked" ||
      record.status === "waiting_user" ||
      record.status === "completed" ||
      record.status === "dismissed"
        ? record.status
        : "open",
    priority:
      record.priority === "critical" ||
      record.priority === "warning" ||
      record.priority === "info"
        ? record.priority
        : "warning",
    title: readString(record.title) ?? "Untitled",
    summary: readString(record.summary),
    projectId: readString(record.projectId),
    conversationId: readString(record.conversationId),
    createdByType:
      record.createdByType === "user" ||
      record.createdByType === "agent" ||
      record.createdByType === "system"
        ? record.createdByType
        : "system",
    createdById: readString(record.createdById),
    createdByName: readString(record.createdByName) ?? "System",
    lastMessageAt:
      typeof record.lastMessageAt === "string"
        ? record.lastMessageAt
        : typeof record.updatedAt === "string"
          ? record.updatedAt
          : new Date(0).toISOString(),
    createdAt: readString(record.createdAt) ?? new Date(0).toISOString(),
    updatedAt: readString(record.updatedAt) ?? new Date(0).toISOString(),
    archived: record.archived === true,
  };
}
