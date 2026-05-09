import { createFileRoute } from "@tanstack/react-router";
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { call } from "@orpc/server";

import { conversationsRouter } from "@/server/orpc/routers/conversations";

type RuntimeTraceEvent =
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
    };

function readTextPart(message: unknown) {
  if (!message || typeof message !== "object") return "";

  const candidate = message as {
    text?: string;
    content?: string;
    parts?: Array<{ type?: string; text?: string }>;
  };

  if (typeof candidate.text === "string") return candidate.text;
  if (typeof candidate.content === "string") return candidate.content;

  if (Array.isArray(candidate.parts)) {
    return candidate.parts
      .reduce((acc, part) => {
        if (part?.type === "text" && typeof part.text === "string") acc.push(part.text);
        return acc;
      }, [] as string[])
      .join("");
  }

  return "";
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          conversationId?: string;
          message?: unknown;
          messages?: UIMessage[];
        };

        if (!body.conversationId) {
          return new Response("Missing conversationId", { status: 400 });
        }
        const conversationId = body.conversationId;

        const latestMessage = body.message ?? body.messages?.[body.messages.length - 1];
        const content = readTextPart(latestMessage).trim();
        if (!content) {
          return new Response("Missing message text", { status: 400 });
        }

        const stream = createUIMessageStream({
          originalMessages: Array.isArray(body.messages) ? body.messages : [],
          execute: async ({ writer }) => {
            const prepareContextToolCallId = `prepare-context-${crypto.randomUUID()}`;
            const runRuntimeToolCallId = `run-runtime-${crypto.randomUUID()}`;

            writer.write({
              type: "tool-input-available",
              toolCallId: prepareContextToolCallId,
              toolName: "prepare_context",
              input: {
                conversationId,
                promptPreview: content.slice(0, 160),
              },
            });
            writer.write({
              type: "tool-output-available",
              toolCallId: prepareContextToolCallId,
              output: {
                status: "ready",
                phase: "conversation-context-prepared",
              },
            });

            writer.write({
              type: "tool-input-available",
              toolCallId: runRuntimeToolCallId,
              toolName: "run_runtime",
              input: {
                conversationId,
                prompt: content,
              },
            });

            const message = (await call(
              conversationsRouter.sendMessage,
              {
                id: conversationId,
                content,
              },
              {
                context: {
                  request,
                  headers: request.headers,
                },
              },
            )) as {
              id?: string;
              content?: string;
              error?: string;
              responseTime?: number;
              createdAt?: string;
              trace?: RuntimeTraceEvent[];
            };
            const textPartId = `${message.id || "assistant"}-text`;

            if (message.error) {
              writer.write({
                type: "tool-output-error",
                toolCallId: runRuntimeToolCallId,
                errorText: message.error,
              });
            } else {
              writer.write({
                type: "tool-output-available",
                toolCallId: runRuntimeToolCallId,
                output: {
                  status: "completed",
                  responseTime: message.responseTime,
                  textLength: (message.content || "").length,
                },
              });
            }

            writer.write({
              type: "start",
              messageId: message.id,
            });

            for (const [index, event] of (message.trace || []).entries()) {
              if (event.kind === "thought" && event.text) {
                const reasoningPartId = `${message.id || "assistant"}-reasoning-${index}`;
                writer.write({
                  type: "reasoning-start",
                  id: reasoningPartId,
                });
                writer.write({
                  type: "reasoning-delta",
                  id: reasoningPartId,
                  delta: event.text,
                });
                writer.write({
                  type: "reasoning-end",
                  id: reasoningPartId,
                });
                continue;
              }

              if (event.kind === "tool" && event.toolCallId && event.toolName) {
                if (event.input !== undefined) {
                  writer.write({
                    type: "tool-input-available",
                    toolCallId: event.toolCallId,
                    toolName: event.toolName,
                    input: event.input,
                  });
                }

                if (event.errorText) {
                  writer.write({
                    type: "tool-output-error",
                    toolCallId: event.toolCallId,
                    errorText: event.errorText,
                  });
                  continue;
                }

                if (event.output !== undefined) {
                  writer.write({
                    type: "tool-output-available",
                    toolCallId: event.toolCallId,
                    output: event.output,
                  });
                }
              }
            }

            writer.write({
              type: "text-start",
              id: textPartId,
            });
            writer.write({
              type: "text-delta",
              id: textPartId,
              delta: message.content || message.error || "",
            });
            writer.write({
              type: "text-end",
              id: textPartId,
            });
            writer.write({
              type: "finish",
              messageMetadata: {
                responseTime: message.responseTime,
                error: message.error,
                createdAt: message.createdAt,
              },
            });
          },
          onError: (error) => {
            if (error instanceof Error) {
              return error.message;
            }

            return "Failed to send message";
          },
        });

        return createUIMessageStreamResponse({ stream });
      },
    },
  },
});
