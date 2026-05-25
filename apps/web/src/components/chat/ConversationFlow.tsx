import { type UIMessage } from "ai";
import { memo, useCallback } from "react";
import { cn, formatDuration } from "@/lib/utils";
import type { ConversationMessage } from "@/lib/api";
import { assistant, user } from "@/paraglide/messages";
import { ChatClarificationCard } from "@/components/chat/ChatClarificationCard";
import { ChatMarkdown } from "@/components/chat/ChatMarkdown";
import { ChatReasoningDrawer } from "@/components/chat/ChatReasoningDrawer";
import { ChatToolTimeline } from "@/components/chat/ChatToolTimeline";
import { Actions, Action } from "@/components/ui/actions";
import { toast } from "@/components/ui/toast";
import {
  CopyIcon,
  RefreshCcwIcon,
} from "lucide-react";

type ConversationUiPart = (
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "clarification"; summary?: string; questions: string[] }
  | ToolConversationUiPart
) & { id: string };

type ToolConversationUiPart = Record<string, unknown> & {
  id: string;
  type: `tool-${string}`;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function prettifyToolName(name: string) {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildMessageParts(message: ConversationMessage): ConversationUiPart[] {
  const parts: ConversationUiPart[] = [];
  let reasoningBuffer = "";
  const toolPartsByCallId = new Map<string, ToolConversationUiPart>();
  const clarificationQuestions = message.clarificationQuestions ?? [];
  let partCounter = 0;

  const nextId = () => `${message.id}-p${partCounter++}`;

  const flushReasoning = () => {
    const text = reasoningBuffer.trim();
    if (!text) return;
    parts.push({ id: nextId(), type: "reasoning", text });
    reasoningBuffer = "";
  };

  for (const [index, event] of (message.trace ?? []).entries()) {
    if (event.kind === "thought" && event.text) {
      reasoningBuffer += event.text;
      continue;
    }

    flushReasoning();

    if (event.kind === "tool" && event.toolName) {
      const toolCallId = event.toolCallId || `${message.id}-tool-${index}`;
      const existing = toolPartsByCallId.get(toolCallId);

      if (existing) {
        if (event.state !== undefined) existing.state = event.state;
        if (event.input !== undefined) existing.input = event.input;
        if (event.output !== undefined) existing.output = event.output;
        if (event.errorText !== undefined) existing.errorText = event.errorText;
        continue;
      }

      const toolPart: ToolConversationUiPart = {
        id: toolCallId,
        type: `tool-${event.toolName}`,
        toolCallId,
        toolDisplayName: prettifyToolName(event.toolName),
        state: event.state,
        input: event.input,
        output: event.output,
        errorText: event.errorText,
      };

      toolPartsByCallId.set(toolCallId, toolPart);
      parts.push(toolPart);
    }
  }

  flushReasoning();

  if (clarificationQuestions.length > 0) {
    parts.push({
      id: nextId(),
      type: "clarification",
      summary: message.content,
      questions: clarificationQuestions,
    });
  }

  if (message.content && clarificationQuestions.length === 0) {
    parts.push({ id: nextId(), type: "text", text: message.content });
  }

  return parts;
}

/**
 * Weak LRU cache for buildMessageParts results.
 * Avoids re-parsing message traces on every render.
 */
const partsCache = new Map<string, ConversationUiPart[]>();
const MAX_PARTS_CACHE = 200;

function getCachedParts(message: ConversationMessage): ConversationUiPart[] {
  const key = `${message.id}:${message.content?.length ?? 0}:${(message.trace ?? []).length}`;
  const cached = partsCache.get(key);
  if (cached) return cached;

  const parts = buildMessageParts(message);

  if (partsCache.size >= MAX_PARTS_CACHE) {
    const firstKey = partsCache.keys().next().value;
    if (firstKey !== undefined) partsCache.delete(firstKey);
  }
  partsCache.set(key, parts);
  return parts;
}

export function mapConversationMessagesToUiMessages(messages: ConversationMessage[]): UIMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    metadata: {
      responseTime: message.responseTime,
      error: message.error,
      executionMode: message.executionMode,
      sandboxStatus: message.sandboxStatus,
      sandboxVmId: message.sandboxVmId,
      projectId: message.projectId,
      projectName: message.projectName,
      clarificationQuestions: message.clarificationQuestions,
      createdAt: message.createdAt,
    },
    parts: getCachedParts(message) as UIMessage["parts"],
  }));
}

export const MessageBubble = memo(function MessageBubble({
  msg,
  userImageUrl,
  onRetry,
}: {
  msg: UIMessage;
  userImageUrl?: string;
  onRetry?: () => void;
}) {
  const isUser = msg.role === "user";
  const parts = msg.parts as ConversationUiPart[];
  const metadata = (msg.metadata ?? {}) as {
    responseTime?: number;
    error?: string;
    executionMode?: "sandbox" | "local";
    sandboxStatus?: "created" | "reused" | "fallback" | "required_failed";
    sandboxVmId?: string;
    projectId?: string;
    projectName?: string;
  };
  const getPartKey = useCallback(
    (part: ConversationUiPart, index: number) => {
      if ("id" in part && typeof part.id === "string" && part.id.length > 0) {
        return part.id;
      }

      if (part.type === "text") {
        return `${msg.id}-text-${index}-${part.text}`;
      }

      if (part.type === "reasoning") {
        return `${msg.id}-reasoning-${index}-${part.text}`;
      }

      if (part.type === "clarification") {
        return `${msg.id}-clarification-${index}-${part.questions.join("|")}`;
      }

      return `${msg.id}-${part.type}-${index}`;
    },
    [msg.id],
  );

  const handleCopy = useCallback(async () => {
    const text = parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("\n");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success("Copied!");
    } catch {
      toast.error("Failed to copy");
    }
  }, [parts]);

  return (
    <div className={cn("flex w-full gap-2.5", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <span
          className={cn(
            "mt-[3px] inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-medium leading-none",
            metadata.error
              ? "bg-destructive/10 text-destructive"
              : "bg-muted",
          )}
        >
          <img src="/logo.svg" alt="" className="size-4" />
        </span>
      )}
      <div className={cn("min-w-0", isUser ? "max-w-[80%]" : "max-w-[85%]")}>
        <div className={cn(
          "mb-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground",
          isUser && "justify-end",
        )}>
          <span className="font-medium text-foreground/60">{isUser ? user() : assistant()}</span>
          {metadata.responseTime != null && <span className="opacity-50">{formatDuration(metadata.responseTime)}</span>}
        </div>
        <div className={cn(
          "rounded-2xl px-3 py-1.5",
          isUser
            ? "bg-primary text-primary-foreground [&_a]:text-primary-foreground/80 [&_a]:underline-offset-4 [&_code]:bg-primary-foreground/15"
            : "bg-muted/50",
        )}>
          {parts.map((part, index) => {
            const key = getPartKey(part, index);

            if (part.type === "text") {
              return (
                <div key={key} className={cn("text-sm leading-7", isUser ? "text-primary-foreground" : "text-foreground/90")}>
                  <ChatMarkdown content={part.text} />
                </div>
              );
            }

            if (part.type === "reasoning") {
              return <ChatReasoningDrawer key={key} text={part.text} metadata={metadata} />;
            }

            if (part.type === "clarification") {
              return (
                <ChatClarificationCard
                  key={key}
                  summary={part.summary}
                  questions={part.questions}
                />
              );
            }

            if (part.type.startsWith("tool-")) {
              return (
                <ChatToolTimeline
                  key={key}
                  part={part as Record<string, unknown> & { type: string }}
                />
              );
            }

            return null;
          })}
        </div>
        {!isUser && (
          <Actions className="mt-2">
            {onRetry && (
              <Action
                label="Retry"
                tooltip="Retry"
                onClick={onRetry}
              >
                <RefreshCcwIcon className="size-4" />
              </Action>
            )}
            <Action
              label="Copy"
              tooltip="Copy"
              onClick={handleCopy}
            >
              <CopyIcon className="size-4" />
            </Action>
          </Actions>
        )}
      </div>
      {isUser && (
        <span className="mt-[3px] inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-medium leading-none text-primary">
          {userImageUrl ? (
            <img src={userImageUrl} alt="" className="size-full object-cover" />
          ) : (
            "U"
          )}
        </span>
      )}
    </div>
  );
});
