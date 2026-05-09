import { create } from "zustand";
import { api, type Conversation, type ConversationMessage } from "@/lib/api";

export interface ConversationFlowDraft {
  id: string;
  role: "assistant";
  content: string;
  responseTime?: number;
  trace?: ConversationMessage["trace"];
}

let loadConversationsPromise: Promise<void> | null = null;
const loadMessagesPromises = new Map<string, Promise<void>>();
let activeMessageLoads = 0;

function sortConversationsByUpdatedAt(conversations: Conversation[]) {
  return [...conversations].sort((a, b) => {
    const aTime =
      typeof a.updatedAt === "string" ? Date.parse(a.updatedAt) : Number.NaN;
    const bTime =
      typeof b.updatedAt === "string" ? Date.parse(b.updatedAt) : Number.NaN;

    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;

    return bTime - aTime;
  });
}

function upsertConversation(
  conversations: Conversation[],
  conversation: Conversation,
) {
  const next = conversations.filter((item) => item.id !== conversation.id);
  next.push(conversation);
  return sortConversationsByUpdatedAt(next);
}

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  pendingConversationId: string | null;
  pendingUserMessageByConversationId: Record<string, string | undefined>;
  flowDraftByConversationId: Record<string, ConversationFlowDraft | undefined>;
  messagesByConversationId: Record<string, ConversationMessage[]>;
  hasLoadedConversations: boolean;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
}

interface ConversationActions {
  loadConversations: (options?: { force?: boolean }) => Promise<void>;
  setActiveConversationId: (id: string | null) => void;
  loadMessages: (
    conversationId: string,
    options?: { force?: boolean },
  ) => Promise<void>;
  createConversation: (data: {
    title?: string;
    projectId?: string;
    agentId?: string;
    runtimeId?: string;
    deleted?: boolean;
  }) => Promise<Conversation>;
  updateConversation: (
    id: string,
    data: {
      title?: string;
      projectId?: string;
      agentId?: string;
      runtimeId?: string;
      archived?: boolean;
      deleted?: boolean;
    },
  ) => Promise<void>;
  deleteConversation: (id: string, permanent?: boolean) => Promise<void>;
  addMessage: (conversationId: string, message: ConversationMessage) => void;
  setConversationPending: (conversationId: string | null) => void;
  setPendingUserMessage: (
    conversationId: string,
    content: string | undefined,
  ) => void;
  setConversationFlowDraft: (
    conversationId: string,
    draft: ConversationFlowDraft | undefined,
  ) => void;
  getActiveConversation: () => Conversation | null;
  getActiveMessages: () => ConversationMessage[];
}

export const useConversationStore = create<
  ConversationState & ConversationActions
>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  pendingConversationId: null,
  pendingUserMessageByConversationId: {},
  flowDraftByConversationId: {},
  messagesByConversationId: {},
  hasLoadedConversations: false,
  isLoadingConversations: false,
  isLoadingMessages: false,

  loadConversations: async (options) => {
    const state = get();
    if (state.hasLoadedConversations && !options?.force) return;
    if (loadConversationsPromise) return loadConversationsPromise;

    set({ isLoadingConversations: true });
    loadConversationsPromise = (async () => {
      try {
        const list = await api.listConversations();
        set({ conversations: list, hasLoadedConversations: true });
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        loadConversationsPromise = null;
        set({ isLoadingConversations: false });
      }
    })();

    return loadConversationsPromise;
  },

  setActiveConversationId: (id) => {
    set({ activeConversationId: id });
  },

  loadMessages: async (conversationId, options) => {
    const cachedMessages = get().messagesByConversationId[conversationId];
    if (cachedMessages && !options?.force) return;
    const inFlightRequest = loadMessagesPromises.get(conversationId);
    if (inFlightRequest) return inFlightRequest;

    activeMessageLoads += 1;
    set({ isLoadingMessages: true });
    const request = (async () => {
      try {
        const msgs = await api.getConversationMessages(conversationId);
        set((state) => ({
          messagesByConversationId: {
            ...state.messagesByConversationId,
            [conversationId]: msgs,
          },
        }));
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        loadMessagesPromises.delete(conversationId);
        activeMessageLoads = Math.max(0, activeMessageLoads - 1);
        set({ isLoadingMessages: activeMessageLoads > 0 });
      }
    })();

    loadMessagesPromises.set(conversationId, request);
    return request;
  },

  createConversation: async (data) => {
    const conv = await api.createConversation(data);
    set((state) => ({
      conversations: upsertConversation(state.conversations, conv),
      activeConversationId: conv.id,
      messagesByConversationId: {
        ...state.messagesByConversationId,
        [conv.id]: state.messagesByConversationId[conv.id] ?? [],
      },
    }));
    return conv;
  },

  updateConversation: async (id, data) => {
    const conversation = await api.updateConversation(id, data);
    set((state) => ({
      conversations: upsertConversation(state.conversations, conversation),
    }));
  },

  deleteConversation: async (id, permanent = false) => {
    await api.deleteConversation(
      id,
      permanent ? { permanent: true } : undefined,
    );
    const { activeConversationId } = get();
    set((state) => ({
      conversations: permanent
        ? state.conversations.filter((conversation) => conversation.id !== id)
        : sortConversationsByUpdatedAt(
            state.conversations.map((conversation) =>
              conversation.id === id
                ? {
                    ...conversation,
                    deleted: true,
                    archived: false,
                    updatedAt: new Date().toISOString(),
                  }
                : conversation,
            ),
          ),
      activeConversationId:
        activeConversationId === id ? null : activeConversationId,
    }));
  },

  addMessage: (conversationId, message) => {
    set((state) => ({
      messagesByConversationId: {
        ...state.messagesByConversationId,
        [conversationId]: [
          ...(state.messagesByConversationId[conversationId] || []),
          message,
        ],
      },
    }));
  },

  setConversationPending: (conversationId) => {
    set({ pendingConversationId: conversationId });
  },

  setPendingUserMessage: (conversationId, content) => {
    set((state) => ({
      pendingUserMessageByConversationId: {
        ...state.pendingUserMessageByConversationId,
        [conversationId]: content,
      },
    }));
  },

  setConversationFlowDraft: (conversationId, draft) => {
    set((state) => ({
      flowDraftByConversationId: {
        ...state.flowDraftByConversationId,
        [conversationId]: draft,
      },
    }));
  },

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get();
    return conversations.find((c) => c.id === activeConversationId) ?? null;
  },

  getActiveMessages: () => {
    const { messagesByConversationId, activeConversationId } = get();
    if (!activeConversationId) return [];
    return messagesByConversationId[activeConversationId] || [];
  },
}));
