import { os } from "@/server/orpc/base";
import { ConversationService } from "@/server/modules/conversation/service";
import { CustomAgentService } from "@/server/modules/custom-agents/service";
import { getLocalDb } from "@/server/runtime/local-db";

async function sendConversationMessage(
  conversationId: string,
  content: string,
  customAgentId?: string,
) {
  const db = await getLocalDb();

  if (customAgentId) {
    const agentService = new CustomAgentService(db);
    const agents = await agentService.list();
    const agent = agents.find((item) => item.id === customAgentId);
    if (!agent) {
      throw new Error("Custom agent not found");
    }

    await ConversationService.addMessage(db, conversationId, "user", content);

    try {
      const url = agent.url.endsWith("/chat/completions")
        ? agent.url
        : `${agent.url.replace(/\/+$/, "")}/chat/completions`;

      const prevMessages = await ConversationService.getMessages(db, conversationId);
      const history = prevMessages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .slice(0, -1)
        .map((message) => ({ role: message.role, content: message.content }));

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${agent.apiKey}`,
        },
        body: JSON.stringify({
          model: agent.model,
          messages: [...history, { role: "user", content }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Agent returned ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const replyContent = data.choices?.[0]?.message?.content ?? "No response";

      return ConversationService.addMessage(db, conversationId, "assistant", replyContent);
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
    const agentService = new CustomAgentService(db);
    const agents = await agentService.list();
    const agent = agents.find((item) => item.id === customAgentId);
    if (!agent) {
      throw new Error("Custom agent not found");
    }

    await ConversationService.deleteLastAssistantMessage(db, conversationId);

    const prevMessages = await ConversationService.getMessages(db, conversationId);
    const history = prevMessages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({ role: message.role, content: message.content }));

    try {
      const url = agent.url.endsWith("/chat/completions")
        ? agent.url
        : `${agent.url.replace(/\/+$/, "")}/chat/completions`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${agent.apiKey}`,
        },
        body: JSON.stringify({
          model: agent.model,
          messages: history,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Agent returned ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const replyContent = data.choices?.[0]?.message?.content ?? "No response";

      return ConversationService.addMessage(db, conversationId, "assistant", replyContent);
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
