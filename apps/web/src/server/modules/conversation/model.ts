export interface ConversationModel {
  createBody: {
    title?: string;
    projectId?: string;
    agentId?: string;
    runtimeId?: string;
    archived?: boolean;
    deleted?: boolean;
  };
  updateBody: {
    title?: string;
    projectId?: string;
    agentId?: string;
    runtimeId?: string;
    archived?: boolean;
    deleted?: boolean;
  };
  sendMessageBody: {
    content: string;
  };
  response: {
    id: string;
    title?: string;
    projectId?: string;
    agentId?: string;
    runtimeId?: string;
    archived: boolean;
    deleted: boolean;
    createdAt: string;
    updatedAt: string;
  };
  messageResponse: {
    id: string;
    conversationId: string;
    role: "user" | "assistant";
    content: string;
    error?: string;
    responseTime?: number;
    createdAt: string;
  };
  errorNotFound: { error: "Conversation not found" };
}
