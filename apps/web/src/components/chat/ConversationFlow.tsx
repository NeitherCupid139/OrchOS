import { type UIMessage } from "ai";
import { cn, formatDuration } from "@/lib/utils";
import type { ConversationMessage } from "@/lib/api";
import { m } from "@/paraglide/messages";
import { ChatClarificationCard } from "@/components/chat/ChatClarificationCard";
import { ChatMarkdown } from "@/components/chat/ChatMarkdown";
import { ChatReasoningDrawer } from "@/components/chat/ChatReasoningDrawer";
import { ChatToolTimeline } from "@/components/chat/ChatToolTimeline";

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
    parts: buildMessageParts(message) as UIMessage["parts"],
  }));
}

export function MessageBubble({ msg, userImageUrl }: { msg: UIMessage; userImageUrl?: string }) {
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

  return (
    <div className="flex w-full gap-2">
      <span
        className={cn(
          "mt-[3px] inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-medium leading-none",
          isUser
            ? "bg-primary/10 text-primary"
            : metadata.error
              ? "bg-destructive/10 text-destructive"
              : "bg-muted",
        )}
      >
        {isUser ? (
          userImageUrl ? (
            <img src={userImageUrl} alt="" className="size-full object-cover" />
          ) : (
            "U"
          )
        ) : (
          <img src="/logo.svg" alt="" className="size-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/60">{isUser ? m.user() : m.assistant()}</span>
          {metadata.responseTime != null && <span className="opacity-50">{formatDuration(metadata.responseTime)}</span>}
        </div>
        {parts.map((part) => {
          if (part.type === "text") {
            return (
              <div key={part.id} className="text-sm leading-7 text-foreground/90">
                <ChatMarkdown content={part.text} />
              </div>
            );
          }

          if (part.type === "reasoning") {
            return <ChatReasoningDrawer key={part.id} text={part.text} metadata={metadata} />;
          }

          if (part.type === "clarification") {
            return (
              <ChatClarificationCard
                key={part.id}
                summary={part.summary}
                questions={part.questions}
              />
            );
          }

          if (part.type.startsWith("tool-")) {
            return (
              <ChatToolTimeline
                key={part.id}
                part={part as Record<string, unknown> & { type: string }}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
