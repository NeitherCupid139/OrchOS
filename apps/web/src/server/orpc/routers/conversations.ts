import { os } from "@/server/orpc/base";
import { authenticateORPCRequest } from "@/server/orpc/context";
import {
  AgentToolService,
  type AgentToolDefinition,
} from "@/server/modules/agent/service";
import {
  ConversationService,
  type Message,
} from "@/server/modules/conversation/service";
import { CustomAgentService } from "@/server/modules/custom-agents/service";
import { RuntimeService } from "@/server/modules/runtime/service";
import { getLocalDb } from "@/server/runtime/local-db";
import { createServiceCache } from "@/server/service-cache";
import { checkCredits } from "@/server/credits-client";
import { getAIGatewayConfig } from "@/server/ai-gateway";
import { getBuiltInAgent } from "@/lib/built-in-agent";
import { subscriptions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import type { AIGatewayConfig } from "@orchos/pro/ai-gateway";
import {
  jsonSchema,
  tool,
  type ModelMessage,
  type ToolChoice,
  type ToolSet,
} from "ai";

// Module-level service cache
const getCustomAgentService = createServiceCache(
  (db) => new CustomAgentService(db),
);
const getAgentToolService = createServiceCache(
  (db) => new AgentToolService(db),
);

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_call_id?: string;
  tool_name?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: ChatMessage;
    finish_reason?: string | null;
  }>;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

async function getCustomAgentConfig(customAgentId: string) {
  const db = await getLocalDb();
  const agentService = getCustomAgentService(db);
  const agents = await agentService.list();
  const agent = agents.find((item) => item.id === customAgentId);
  if (!agent) throw new Error("Custom agent not found");
  return { db, agent };
}

function conversationHistoryToChatMessages(messages: Message[]): ChatMessage[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

const CURRENT_TIME_TOOL_NAME = "get_current_time";
const TEMPORAL_REQUEST_PATTERN =
  /(今天|明天|后天|昨天|周[一二三四五六日天]|星期|日期|时间|几点|天气|提醒|代办|待办|日历|安排|预约|today|tomorrow|yesterday|date|time|weather|remind|reminder|todo|calendar|schedule)/i;

function shouldForceCurrentTimeTool(messages: ChatMessage[]) {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content;

  return TEMPORAL_REQUEST_PATTERN.test(lastUserMessage ?? "");
}

/**
 * Convert internal ChatMessage format to AI SDK ModelMessage format.
 */
function toModelMessages(messages: ChatMessage[]): ModelMessage[] {
  return messages
    .filter((m) => m.role !== "tool" || m.tool_call_id)
    .map<ModelMessage>((m) => {
      if (m.role === "system")
        return { role: "system", content: m.content ?? "" };
      if (m.role === "user") return { role: "user", content: m.content ?? "" };

      if (m.role === "assistant") {
        if (m.tool_calls && m.tool_calls.length > 0) {
          return {
            role: "assistant",
            content: [
              ...(m.content
                ? [{ type: "text" as const, text: m.content }]
                : []),
              ...m.tool_calls.map((tc) => ({
                type: "tool-call" as const,
                toolCallId: tc.id,
                toolName: tc.function.name,
                input: safeJsonParse(tc.function.arguments),
              })),
            ],
          };
        }
        return { role: "assistant", content: m.content ?? "" };
      }

      // role === "tool"
      return {
        role: "tool",
        content: [
          {
            type: "tool-result" as const,
            toolCallId: m.tool_call_id ?? "",
            toolName: m.tool_name ?? "unknown",
            output: {
              type: "json" as const,
              value: safeJsonParse(m.content ?? ""),
            },
          },
        ],
      } as ModelMessage;
    });
}

/**
 * Convert AgentToolDefinition to AI SDK ToolSet using the `tool()` helper.
 */
function toAISDKTools(tools?: AgentToolDefinition[]): ToolSet | undefined {
  if (!tools || tools.length === 0) return undefined;

  const toolSet: ToolSet = {};
  for (const t of tools) {
    toolSet[t.function.name] = tool({
      description: t.function.description,
      inputSchema: jsonSchema({
        type: "object",
        properties: (t.function.parameters.properties ?? {}) as Record<
          string,
          unknown
        >,
        required: (t.function.parameters.required ?? []) as string[],
        additionalProperties: false,
      }),
    }) as never;
  }
  return toolSet;
}

/**
 * Single-step chat completion using AI SDK's generateText.
 *
 * Supports three modes:
 * - BYOK mode (url & apiKey omitted): gateway handles auth/billing
 * - Custom agent through gateway (url + gatewayConfig): routed via CF AI Gateway
 * - Direct mode (no gatewayConfig): direct to provider
 */
async function requestChatCompletion(input: {
  url?: string;
  apiKey?: string;
  model: string;
  messages: ChatMessage[];
  tools?: AgentToolDefinition[];
  toolChoice?: ToolChoice<ToolSet>;
  gatewayConfig?: AIGatewayConfig | null;
}): Promise<ChatCompletionResponse> {
  const { generateText } = await import("ai");
  const { createModelFromAgent } = await import("../../ai/provider");

  const languageModel = await createModelFromAgent({
    url: input.url,
    apiKey: input.apiKey,
    model: input.model,
    gatewayConfig: input.gatewayConfig,
  });

  const result = await generateText({
    model: languageModel,
    messages: toModelMessages(input.messages),
    tools: toAISDKTools(input.tools),
    toolChoice:
      input.toolChoice ??
      (input.tools && input.tools.length > 0 ? "auto" : undefined),
  });

  return {
    choices: result.toolCalls?.length
      ? [
          {
            message: {
              role: "assistant",
              content: result.text,
              tool_calls: result.toolCalls.map((tc) => ({
                id: tc.toolCallId,
                type: "function" as const,
                function: {
                  name: tc.toolName,
                  arguments: JSON.stringify(tc.input),
                },
              })),
            },
            finish_reason: result.finishReason,
          },
        ]
      : [
          {
            message: { role: "assistant", content: result.text },
            finish_reason: result.finishReason,
          },
        ],
    usage: result.usage
      ? {
          promptTokens: result.usage.inputTokens,
          completionTokens: result.usage.outputTokens,
          totalTokens: result.usage.totalTokens,
        }
      : undefined,
  };
}

async function runCustomAgentConversation(input: {
  conversationId: string;
  customAgentId: string;
  userContent?: string;
  retry?: boolean;
}) {
  const { db, agent } = await getCustomAgentConfig(input.customAgentId);
  const toolService = getAgentToolService(db);
  const gatewayConfig = await getAIGatewayConfig();

  if (input.retry) {
    await ConversationService.deleteLastAssistantMessage(
      db,
      input.conversationId,
    );
  } else if (input.userContent !== undefined) {
    await ConversationService.addMessage(
      db,
      input.conversationId,
      "user",
      input.userContent,
    );
  }

  const storedMessages = await ConversationService.getMessages(
    db,
    input.conversationId,
  );
  const chatMessages = conversationHistoryToChatMessages(storedMessages);
  const tools = toolService.getToolDefinitions();
  const trace: NonNullable<Message["trace"]> = [];
  let totalTokens = 0;
  const shouldUseCurrentTime = shouldForceCurrentTimeTool(chatMessages);

  for (let step = 0; step < 6; step += 1) {
    const completion = await requestChatCompletion({
      url: agent.url,
      apiKey: agent.apiKey,
      model: agent.model,
      messages: chatMessages,
      tools,
      toolChoice:
        step === 0 && shouldUseCurrentTime
          ? { type: "tool", toolName: CURRENT_TIME_TOOL_NAME }
          : undefined,
      gatewayConfig,
    });

    const choice = completion.choices?.[0];
    const assistantMessage = choice?.message;
    const toolCalls = assistantMessage?.tool_calls ?? [];
    const assistantContent = assistantMessage?.content ?? "";

    if (completion.usage?.totalTokens)
      totalTokens += completion.usage.totalTokens;
    if (assistantContent)
      trace.push({ kind: "message", text: assistantContent });

    if (toolCalls.length === 0) {
      return ConversationService.addMessage(
        db,
        input.conversationId,
        "assistant",
        assistantContent || "No response",
        undefined,
        undefined,
        { trace, tokens: totalTokens > 0 ? totalTokens : undefined },
      );
    }

    chatMessages.push({
      role: "assistant",
      content: assistantContent,
      tool_calls: toolCalls,
    });

    // Push "started" trace entries for all tool calls
    for (const toolCall of toolCalls) {
      trace.push({
        kind: "tool",
        toolName: toolCall.function.name,
        toolCallId: toolCall.id,
        state: "started",
        input: toolCall.function.arguments,
      });
    }

    // Execute all tools concurrently — each tool call is independent
    const toolResults = await Promise.allSettled(
      toolCalls.map((tc) =>
        toolService.executeTool(tc.function.name, tc.function.arguments),
      ),
    );

    // Process results in original order to preserve trace + message ordering
    for (let i = 0; i < toolCalls.length; i++) {
      const toolCall = toolCalls[i];
      const result = toolResults[i];

      if (result.status === "fulfilled") {
        trace.push({
          kind: "tool",
          toolName: toolCall.function.name,
          toolCallId: toolCall.id,
          state: "completed",
          output: result.value,
        });
        chatMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          tool_name: toolCall.function.name,
          content: JSON.stringify(result.value),
        });
      } else {
        const errorText =
          result.reason instanceof Error
            ? result.reason.message
            : `Tool ${toolCall.function.name} failed`;
        trace.push({
          kind: "tool",
          toolName: toolCall.function.name,
          toolCallId: toolCall.id,
          state: "failed",
          errorText,
        });
        chatMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          tool_name: toolCall.function.name,
          content: JSON.stringify({ error: errorText }),
        });
      }
    }
  }

  const finalCompletion = await requestChatCompletion({
    url: agent.url,
    apiKey: agent.apiKey,
    model: agent.model,
    messages: chatMessages,
    gatewayConfig,
  });
  const finalContent = finalCompletion.choices?.[0]?.message?.content ?? "";
  if (finalCompletion.usage?.totalTokens) {
    totalTokens += finalCompletion.usage.totalTokens;
  }
  if (finalContent) trace.push({ kind: "message", text: finalContent });

  return ConversationService.addMessage(
    db,
    input.conversationId,
    "assistant",
    finalContent || "工具调用已完成，但没有生成最终回复。",
    undefined,
    undefined,
    { trace, tokens: totalTokens > 0 ? totalTokens : undefined },
  );
}

/**
 * Run a conversation with the built-in agent via Cloudflare AI Gateway (BYOK mode).
 *
 * Unlike custom agents, the built-in agent:
 * - Uses BYOK mode (no provider URL or API key needed)
 * - Routes through Cloudflare AI Gateway (handles auth & observability)
 * - Supports all agent tools (web search, calendar, reminders, email, bookmarks)
 */
async function runBuiltinAgentConversation(input: {
  conversationId: string;
  userContent?: string;
  retry?: boolean;
}) {
  const db = await getLocalDb();
  const gatewayConfig = await getAIGatewayConfig();
  const builtIn = getBuiltInAgent();
  const toolService = getAgentToolService(db);

  // If gateway is not configured, fall back to the previous runtime-based path
  if (!gatewayConfig) {
    // Auto-assign the first enabled runtime if the conversation has none
    const conv = await ConversationService.get(db, input.conversationId);
    if (conv && !conv.runtimeId) {
      const enabledRuntimes = (await RuntimeService.list(db)).filter(
        (r) => r.enabled,
      );
      if (enabledRuntimes.length > 0) {
        await ConversationService.update(db, input.conversationId, {
          runtimeId: enabledRuntimes[0].id,
        });
      }
    }

    if (input.retry) {
      return ConversationService.retryLastReply(db, input.conversationId);
    }
    return ConversationService.sendAndReply(db, input.conversationId, input.userContent ?? "");
  }

  if (input.retry) {
    await ConversationService.deleteLastAssistantMessage(
      db,
      input.conversationId,
    );
  } else if (input.userContent !== undefined) {
    await ConversationService.addMessage(
      db,
      input.conversationId,
      "user",
      input.userContent,
    );
  }

  const storedMessages = await ConversationService.getMessages(
    db,
    input.conversationId,
  );
  const chatMessages = conversationHistoryToChatMessages(storedMessages);
  const tools = toolService.getToolDefinitions();
  const trace: NonNullable<Message["trace"]> = [];
  let totalTokens = 0;
  const shouldUseCurrentTime = shouldForceCurrentTimeTool(chatMessages);

  for (let step = 0; step < 6; step += 1) {
    const completion = await requestChatCompletion({
      model: builtIn.model,
      messages: chatMessages,
      tools,
      toolChoice:
        step === 0 && shouldUseCurrentTime
          ? { type: "tool", toolName: CURRENT_TIME_TOOL_NAME }
          : undefined,
      gatewayConfig,
      // No url or apiKey → BYOK mode: gateway handles auth
    });

    const choice = completion.choices?.[0];
    const assistantMessage = choice?.message;
    const toolCalls = assistantMessage?.tool_calls ?? [];
    const assistantContent = assistantMessage?.content ?? "";

    if (completion.usage?.totalTokens)
      totalTokens += completion.usage.totalTokens;
    if (assistantContent)
      trace.push({ kind: "message", text: assistantContent });

    if (toolCalls.length === 0) {
      return ConversationService.addMessage(
        db,
        input.conversationId,
        "assistant",
        assistantContent || "No response",
        undefined,
        undefined,
        { trace, tokens: totalTokens > 0 ? totalTokens : undefined },
      );
    }

    chatMessages.push({
      role: "assistant",
      content: assistantContent,
      tool_calls: toolCalls,
    });

    // Push "started" trace entries for all tool calls
    for (const toolCall of toolCalls) {
      trace.push({
        kind: "tool",
        toolName: toolCall.function.name,
        toolCallId: toolCall.id,
        state: "started",
        input: toolCall.function.arguments,
      });
    }

    // Execute all tools concurrently — each tool call is independent
    const toolResults = await Promise.allSettled(
      toolCalls.map((tc) =>
        toolService.executeTool(tc.function.name, tc.function.arguments),
      ),
    );

    // Process results in original order to preserve trace + message ordering
    for (let i = 0; i < toolCalls.length; i++) {
      const toolCall = toolCalls[i];
      const result = toolResults[i];

      if (result.status === "fulfilled") {
        trace.push({
          kind: "tool",
          toolName: toolCall.function.name,
          toolCallId: toolCall.id,
          state: "completed",
          output: result.value,
        });
        chatMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          tool_name: toolCall.function.name,
          content: JSON.stringify(result.value),
        });
      } else {
        const errorText =
          result.reason instanceof Error
            ? result.reason.message
            : `Tool ${toolCall.function.name} failed`;
        trace.push({
          kind: "tool",
          toolName: toolCall.function.name,
          toolCallId: toolCall.id,
          state: "failed",
          errorText,
        });
        chatMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          tool_name: toolCall.function.name,
          content: JSON.stringify({ error: errorText }),
        });
      }
    }
  }

  const finalCompletion = await requestChatCompletion({
    model: builtIn.model,
    messages: chatMessages,
    gatewayConfig,
  });
  const finalContent = finalCompletion.choices?.[0]?.message?.content ?? "";
  if (finalCompletion.usage?.totalTokens) {
    totalTokens += finalCompletion.usage.totalTokens;
  }
  if (finalContent) trace.push({ kind: "message", text: finalContent });

  return ConversationService.addMessage(
    db,
    input.conversationId,
    "assistant",
    finalContent || "工具调用已完成，但没有生成最终回复。",
    undefined,
    undefined,
    { trace, tokens: totalTokens > 0 ? totalTokens : undefined },
  );
}

async function sendConversationMessage(
  conversationId: string,
  content: string,
  customAgentId?: string,
) {
  const db = await getLocalDb();

  if (customAgentId) {
    try {
      return await runCustomAgentConversation({
        conversationId,
        customAgentId,
        userContent: content,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get response from custom agent";
      return ConversationService.addMessage(
        db,
        conversationId,
        "assistant",
        errorMessage,
        errorMessage,
      );
    }
  }

  return runBuiltinAgentConversation({
    conversationId,
    userContent: content,
  });
}

async function retryConversationMessage(
  conversationId: string,
  customAgentId?: string,
) {
  const db = await getLocalDb();

  if (customAgentId) {
    try {
      return await runCustomAgentConversation({
        conversationId,
        customAgentId,
        retry: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get response from custom agent";
      return ConversationService.addMessage(
        db,
        conversationId,
        "assistant",
        errorMessage,
        errorMessage,
      );
    }
  }

  return runBuiltinAgentConversation({
    conversationId,
    retry: true,
  });
}

export const conversationsRouter = {
  list: os.conversations.list.handler(async () => {
    return ConversationService.list(await getLocalDb());
  }),
  get: os.conversations.get.handler(async ({ input }) => {
    return (
      (await ConversationService.get(await getLocalDb(), input.id)) ?? null
    );
  }),
  create: os.conversations.create.handler(async ({ input }) => {
    return ConversationService.create(await getLocalDb(), input);
  }),
  update: os.conversations.update.handler(async ({ input }) => {
    return (
      (await ConversationService.update(await getLocalDb(), input.id, {
        title: input.title,
        projectId: input.projectId,
        runtimeId: input.runtimeId,
        archived: input.archived,
        deleted: input.deleted,
      })) ?? null
    );
  }),
  delete: os.conversations.delete.handler(async ({ input }) => {
    const success = input.permanent
      ? await ConversationService.hardDelete(await getLocalDb(), input.id)
      : await ConversationService.delete(await getLocalDb(), input.id);
    return { success };
  }),
  clearDeleted: os.conversations.clearDeleted.handler(async () => {
    const count = await ConversationService.clearDeleted(await getLocalDb());
    return { success: true, count };
  }),
  listMessages: os.conversations.listMessages.handler(async ({ input }) => {
    const conv = await ConversationService.get(await getLocalDb(), input.id);
    if (!conv) throw new Error("Conversation not found");
    return ConversationService.getMessages(await getLocalDb(), input.id);
  }),
  sendMessage: os.conversations.sendMessage.handler(
    async ({ input, context }) => {
      try {
        const auth = await authenticateORPCRequest(context.request);
        const userId = auth?.userId;
        if (userId) {
          const db = await getLocalDb();
          const sub = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, userId))
            .get();
          if (sub) {
            const plan = sub.plan as "free" | "pro";
            const balance = Number(sub.creditsBalance);
            const creditCheck = await checkCredits(userId, plan, balance);
            if (!creditCheck.allowed) throw new Error(creditCheck.reason);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("credits"))
          throw error;
      }

      try {
        const message = await sendConversationMessage(
          input.id,
          input.content,
          input.customAgentId,
        );
        return message;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("[sendMessage] Error:", errorMsg);
        try {
          const db = await getLocalDb();
          return await ConversationService.addMessage(
            db,
            input.id,
            "assistant",
            `❌ ${errorMsg}`,
            errorMsg,
          );
        } catch {
          throw err;
        }
      }
    },
  ),
  retryMessage: os.conversations.retryMessage.handler(async ({ input }) => {
    return retryConversationMessage(input.id, input.customAgentId);
  }),
};

export { sendConversationMessage };
