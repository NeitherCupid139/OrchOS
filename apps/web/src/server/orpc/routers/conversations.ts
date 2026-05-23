import { os } from "@/server/orpc/base";
import { AgentToolService, type AgentToolDefinition } from "@/server/modules/agent/service";
import {
  inferOpenAICompatibleOperationForModel,
  requestOpenAICompatibleChatCompletion,
} from "@/server/modules/custom-agents/openai-compatible";
import { ConversationService, type Message } from "@/server/modules/conversation/service";
import { CustomAgentService } from "@/server/modules/custom-agents/service";
import { getLocalDb } from "@/server/runtime/local-db";

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
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

function safeParseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function getCustomAgentConfig(customAgentId: string) {
  const db = await getLocalDb();
  const agentService = new CustomAgentService(db);
  const agents = await agentService.list();
  const agent = agents.find((item) => item.id === customAgentId);
  if (!agent) {
    throw new Error("Custom agent not found");
  }

  return {
    db,
    agent,
  };
}

function conversationHistoryToChatMessages(messages: Message[]): ChatMessage[] {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

function buildAnthropicMessages(messages: ChatMessage[]) {
  const anthropicMessages: Array<{
    role: "user" | "assistant";
    content: Array<Record<string, unknown>>;
  }> = [];

  for (const message of messages) {
    if (message.role === "system") {
      continue;
    }

    if (message.role === "user") {
      anthropicMessages.push({
        role: "user",
        content: [{ type: "text", text: message.content ?? "" }],
      });
      continue;
    }

    if (message.role === "assistant") {
      const content: Array<Record<string, unknown>> = [];

      if (message.content) {
        content.push({ type: "text", text: message.content });
      }

      for (const toolCall of message.tool_calls ?? []) {
        content.push({
          type: "tool_use",
          id: toolCall.id,
          name: toolCall.function.name,
          input: safeParseJsonObject(toolCall.function.arguments),
        });
      }

      anthropicMessages.push({
        role: "assistant",
        content: content.length > 0 ? content : [{ type: "text", text: "" }],
      });
      continue;
    }

    anthropicMessages.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: message.tool_call_id ?? "",
          content: message.content ?? "",
        },
      ],
    });
  }

  return anthropicMessages;
}

function buildResponsesInput(messages: ChatMessage[]) {
  const responsesInput: Array<Record<string, unknown>> = [];

  for (const message of messages) {
    if (message.role === "system") {
      continue;
    }

    if (message.role === "user" || message.role === "assistant") {
      if (message.content) {
        responsesInput.push({
          role: message.role,
          content: [
            {
              type: "input_text",
              text: message.content,
            },
          ],
        });
      }

      for (const toolCall of message.tool_calls ?? []) {
        responsesInput.push({
          type: "function_call",
          call_id: toolCall.id,
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        });
      }

      continue;
    }

    if (message.tool_call_id) {
      responsesInput.push({
        type: "function_call_output",
        call_id: message.tool_call_id,
        output: message.content ?? "",
      });
    }
  }

  return responsesInput;
}

async function requestChatCompletion(input: {
  url: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  tools?: AgentToolDefinition[];
}) {
  const operation = inferOpenAICompatibleOperationForModel(input.model);
  const chatBody = {
    model: input.model,
    messages: input.messages,
    tools: input.tools,
    tool_choice: input.tools && input.tools.length > 0 ? "auto" : undefined,
  };

  const anthropicBody = {
    model: input.model,
    max_tokens: 4096,
    messages: buildAnthropicMessages(input.messages),
    tools: input.tools?.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    })),
  };

  const responsesBody = {
    model: input.model,
    input: buildResponsesInput(input.messages),
    tools: input.tools?.map((tool) => ({
      type: "function",
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters,
    })),
    tool_choice: input.tools && input.tools.length > 0 ? "auto" : undefined,
  };

  return requestOpenAICompatibleChatCompletion<ChatCompletionResponse>(fetch, {
    url: input.url,
    apiKey: input.apiKey,
    model: input.model,
    body:
      operation === "messages"
        ? anthropicBody
        : operation === "responses"
          ? responsesBody
          : chatBody,
  });
}

async function runCustomAgentConversation(input: {
  conversationId: string;
  customAgentId: string;
  userContent?: string;
  retry?: boolean;
}) {
  const { db, agent } = await getCustomAgentConfig(input.customAgentId);
  const toolService = new AgentToolService(db);

  if (input.retry) {
    await ConversationService.deleteLastAssistantMessage(db, input.conversationId);
  } else if (input.userContent !== undefined) {
    await ConversationService.addMessage(db, input.conversationId, "user", input.userContent);
  }

  const storedMessages = await ConversationService.getMessages(db, input.conversationId);
  const chatMessages = conversationHistoryToChatMessages(storedMessages);
  const tools = toolService.getToolDefinitions();
  const trace: NonNullable<Message["trace"]> = [];
  let totalTokens = 0;

  for (let step = 0; step < 6; step += 1) {
    const completion = await requestChatCompletion({
      url: agent.url,
      apiKey: agent.apiKey,
      model: agent.model,
      messages: chatMessages,
      tools,
    });

    const choice = completion.choices?.[0];
    const assistantMessage = choice?.message;
    const toolCalls = assistantMessage?.tool_calls ?? [];
    const assistantContent = assistantMessage?.content ?? "";

    // Accumulate tokens from this completion
    if (completion.usage?.totalTokens) {
      totalTokens += completion.usage.totalTokens;
    }

    if (assistantContent) {
      trace.push({ kind: "message", text: assistantContent });
    }

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

    for (const toolCall of toolCalls) {
      trace.push({
        kind: "tool",
        toolName: toolCall.function.name,
        toolCallId: toolCall.id,
        state: "started",
        input: toolCall.function.arguments,
      });

      try {
        const output = await toolService.executeTool(
          toolCall.function.name,
          toolCall.function.arguments,
        );

        trace.push({
          kind: "tool",
          toolName: toolCall.function.name,
          toolCallId: toolCall.id,
          state: "completed",
          output,
        });

        chatMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(output),
        });
      } catch (error) {
        const errorText =
          error instanceof Error ? error.message : `Tool ${toolCall.function.name} failed`;

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
          content: JSON.stringify({ error: errorText }),
        });
      }
    }
  }

  return ConversationService.addMessage(
    db,
    input.conversationId,
    "assistant",
    "Agent exceeded tool execution limit.",
    "Agent exceeded tool execution limit.",
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
        error instanceof Error ? error.message : "Failed to get response from custom agent";

      return ConversationService.addMessage(
        db,
        conversationId,
        "assistant",
        errorMessage,
        errorMessage,
      );
    }
  }

  const conversation = await ConversationService.get(db, conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  return ConversationService.sendAndReply(db, conversationId, content);
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
        error instanceof Error ? error.message : "Failed to get response from custom agent";

      return ConversationService.addMessage(
        db,
        conversationId,
        "assistant",
        errorMessage,
        errorMessage,
      );
    }
  }

  return ConversationService.retryLastReply(db, conversationId);
}

export const conversationsRouter = {
  list: os.conversations.list.handler(async () => {
    return ConversationService.list(await getLocalDb());
  }),
  get: os.conversations.get.handler(async ({ input }) => {
    return (await ConversationService.get(await getLocalDb(), input.id)) ?? null;
  }),
  create: os.conversations.create.handler(async ({ input }) => {
    return ConversationService.create(await getLocalDb(), input);
  }),
  update: os.conversations.update.handler(async ({ input }) => {
    return (
      (await ConversationService.update(await getLocalDb(), input.id, {
        title: input.title,
        projectId: input.projectId,
        agentId: input.agentId,
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
    const conversation = await ConversationService.get(await getLocalDb(), input.id);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    return ConversationService.getMessages(await getLocalDb(), input.id);
  }),
  sendMessage: os.conversations.sendMessage.handler(async ({ input }) => {
    return sendConversationMessage(input.id, input.content, input.customAgentId);
  }),
  retryMessage: os.conversations.retryMessage.handler(async ({ input }) => {
    return retryConversationMessage(input.id, input.customAgentId);
  }),
};

export { sendConversationMessage };
