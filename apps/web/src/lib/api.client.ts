import { orpc } from "@/lib/orpc/client";

import type {
  ActivityHeatmapPoint,
  AgentMetrics,
  AgentTimelinePoint,
  BookmarkCategory,
  ControlSettings,
  Conversation,
  ConversationMessage,
  CustomAgent,
  CustomAgentModelsResponse,
  DetectRuntimesResponse,
  InboxMessage,
  InboxMessageType,
  InboxPriority,
  InboxThread,
  InboxThreadKind,
  InboxThreadStatus,
  Integration,
  LocalAgentPairingToken,
  LocalAgentProfile,
  ObservabilityMetrics,
  Organization,
  PlatformDataExport,
  PlatformDataImportResult,
  Problem,
  ProblemPriority,
  ProblemStatus,
  ProblemSummary,
  PlannerReminder,
  PlannerStore,
  Project,
  RegisterRuntimesResponse,
  RuntimeModelsResponse,
  RuntimeProfile,
  TimeSeriesPoint,
} from "./api.types";
import {
  normalizeConversationMessage,
  normalizeInboxThread,
} from "./api.normalizers";

const CLIENT_STORAGE_ALLOWLIST = new Set(["favicon_cache_v1"]);

function isPortableClientStorageKey(key: string) {
  return key.startsWith("orchos-") || CLIENT_STORAGE_ALLOWLIST.has(key);
}

function collectPortableClientStorage(): Record<string, string> | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const storage: Record<string, string> = {};

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (!key || !isPortableClientStorageKey(key)) {
        continue;
      }

      const value = window.localStorage.getItem(key);
      if (value !== null) {
        storage[key] = value;
      }
    }
  } catch {
    return undefined;
  }

  return storage;
}

function restorePortableClientStorage(storage?: Record<string, string>) {
  if (typeof window === "undefined" || !storage) {
    return;
  }

  try {
    const existingKeys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && isPortableClientStorageKey(key)) {
        existingKeys.push(key);
      }
    }

    for (const key of existingKeys) {
      window.localStorage.removeItem(key);
    }

    for (const [key, value] of Object.entries(storage)) {
      if (isPortableClientStorageKey(key)) {
        window.localStorage.setItem(key, value);
      }
    }
  } catch {
    // The server-side import has already completed; local UI cache restore is best-effort.
  }
}

export const api = {
  listRuntimes: async (): Promise<RuntimeProfile[]> => {
    return (await orpc.runtimes.list({})) as RuntimeProfile[];
  },
  detectRuntimes: async (): Promise<DetectRuntimesResponse> => {
    return (await orpc.runtimes.detect({})) as DetectRuntimesResponse;
  },
  listLocalAgents: async (): Promise<LocalAgentProfile[]> => {
    try {
      return (await orpc.localAgents.list({})) as LocalAgentProfile[];
    } catch {
      return [];
    }
  },
  createLocalAgentPairingToken: async (): Promise<LocalAgentPairingToken> => {
    try {
      return (await orpc.localAgents.createPairingToken({})) as LocalAgentPairingToken;
    } catch {
      throw new Error("Sign in to generate a local agent pairing token.");
    }
  },
  listIntegrations: async (): Promise<Integration[]> => {
    const payload = (await orpc.integrations.list({})) as unknown;
    return Array.isArray(payload) ? (payload as Integration[]) : [];
  },
  getPlannerStore: async (): Promise<PlannerStore> => {
    return (await orpc.planner.getStore({})) as PlannerStore;
  },
  createPlannerCalendar: async (data: {
    groupId?: string;
    name: string;
    color: string;
    description?: string;
    icon: string;
  }): Promise<PlannerStore> => {
    return (await orpc.planner.createCalendar(data)) as PlannerStore;
  },
  updatePlannerCalendar: async (data: {
    id: string;
    groupId?: string;
    name?: string;
    color?: string;
    description?: string;
    icon?: string;
  }): Promise<PlannerStore> => {
    return (await orpc.planner.updateCalendar(data)) as PlannerStore;
  },
  deletePlannerCalendar: async (id: string): Promise<PlannerStore> => {
    return (await orpc.planner.deleteCalendar({ id })) as PlannerStore;
  },
  createPlannerEvent: async (data: {
    calendarId: string;
    title: string;
    description?: string;
    location?: string;
    startAt: string;
    endAt: string;
    allDay: boolean;
    provider?: "local" | "google";
    externalId?: string;
    accountId?: string;
  }): Promise<PlannerStore> => {
    return (await orpc.planner.createEvent(data)) as PlannerStore;
  },
  updatePlannerEvent: async (data: {
    id: string;
    calendarId?: string;
    title?: string;
    description?: string;
    location?: string;
    startAt?: string;
    endAt?: string;
    allDay?: boolean;
    provider?: "local" | "google";
    externalId?: string;
    accountId?: string;
  }): Promise<PlannerStore> => {
    return (await orpc.planner.updateEvent(data)) as PlannerStore;
  },
  createPlannerReminder: async (data: {
    title: string;
    notes?: string;
    remindAt?: string;
    schedule?: PlannerReminder["schedule"];
  }): Promise<PlannerReminder> => {
    return (await orpc.planner.createReminder(data)) as PlannerReminder;
  },
  updatePlannerReminder: async (data: {
    id: string;
    title?: string;
    notes?: string;
    remindAt?: string;
    schedule?: PlannerReminder["schedule"];
    completed?: boolean;
  }): Promise<PlannerStore> => {
    return (await orpc.planner.updateReminder(data)) as PlannerStore;
  },
  deletePlannerReminder: async (id: string): Promise<PlannerStore> => {
    return (await orpc.planner.deleteReminder({ id })) as PlannerStore;
  },
  connectIntegration: async (
    id: "github" | "gitlab",
    data: { accessToken: string; apiUrl?: string },
  ): Promise<Integration> => {
    return (await orpc.integrations.connect({ id, ...data })) as Integration;
  },
  connectGoogleIntegration: async (
    id: "gmail",
    data: {
      clientId: string;
      clientSecret: string;
      refreshToken: string;
      label?: string;
    },
  ): Promise<Integration> => {
    return (await orpc.integrations.connectGoogle({ id, ...data })) as Integration;
  },
  createSmtpImapAccount: async (data: {
    email: string;
    displayName?: string;
    username: string;
    password: string;
    smtp: { host: string; port: number; secure: boolean };
    imap: { host: string; port: number; secure: boolean };
  }): Promise<Integration> => {
    return (await orpc.integrations.createSmtpImapAccount(data)) as Integration;
  },
  updateIntegrationAccount: async (
    id: string,
    accountId: string,
    data: {
      label?: string;
      email?: string;
      username?: string;
      smtpImap?: {
        email: string;
        displayName?: string;
        smtp: { host: string; port: number; secure: boolean };
        imap: { host: string; port: number; secure: boolean };
        username: string;
        password: string;
      };
    },
  ): Promise<Integration> => {
    return (await orpc.integrations.updateAccount({
      id,
      accountId,
      ...data,
    })) as Integration;
  },
  deleteIntegrationAccount: async (
    id: string,
    accountId: string,
  ): Promise<Integration> => {
    return (await orpc.integrations.deleteAccount({ id, accountId })) as Integration;
  },
  disconnectIntegration: async (id: string): Promise<{ success: boolean }> => {
    return (await orpc.integrations.disconnect({ id })) as { success: boolean };
  },
  registerDetectedRuntimes: (data: {
    runtimeIds?: string[];
    registerAll?: boolean;
  }): Promise<RegisterRuntimesResponse> => {
    return orpc.runtimes.registerDetected(data) as Promise<RegisterRuntimesResponse>;
  },
  updateRuntime: (
    id: string,
    data: {
      enabled?: boolean;
      status?: RuntimeProfile["status"];
      transport?: RuntimeProfile["transport"];
    },
  ): Promise<RuntimeProfile> => {
    return orpc.runtimes.update({ id, ...data }).then((runtime) => {
      if (!runtime) throw new Error("API error: 404");
      return runtime as RuntimeProfile;
    });
  },
  healthCheckRuntime: async (runtimeId: string, level?: "basic" | "ping" | "full") => {
    return (await orpc.runtimes.health({ runtimeId, level })) as {
      healthy: boolean;
      level: string;
      output: string;
      error?: string;
      responseTime: number;
      agentName: string;
      agentCommand: string;
      authRequired?: boolean;
    };
  },
  listRuntimeModels: async (runtimeId: string) => {
    return (await orpc.runtimes.models({ runtimeId })) as RuntimeModelsResponse;
  },
  chatWithRuntime: (runtimeId: string, prompt: string) => {
    return orpc.runtimes.chat({ runtimeId, prompt }) as Promise<{
      success: boolean;
      output: string;
      error?: string;
      agentName: string;
      responseTime: number;
    }>;
  },
  listProjects: async (): Promise<Project[]> => {
    return (await orpc.projects.list({})) as Project[];
  },
  getProject: async (id: string): Promise<Project> => {
    const project = (await orpc.projects.get({ id })) as Project | null;
    if (!project) throw new Error("API error: 404");
    return project;
  },
  createProject: (data: {
    name: string;
    path: string;
    repositoryUrl?: string;
  }): Promise<Project> => orpc.projects.create(data) as Promise<Project>,
  updateProject: (
    id: string,
    data: Partial<Pick<Project, "name" | "path" | "repositoryUrl">>,
  ): Promise<Project> => {
    return orpc.projects.update({ id, ...data }).then((project) => {
      if (!project) throw new Error("API error: 404");
      return project as Project;
    });
  },
  deleteProject: async (id: string): Promise<void> => {
    const result = await orpc.projects.delete({ id });
    if (!result.success) throw new Error("API error: 404");
  },
  browseDirectory: async (path?: string) => {
    return (await orpc.filesystem.browse({ path })) as {
      currentPath: string;
      parentPath?: string;
      directories: { name: string; path: string }[];
    };
  },
  readWorkspaceFile: async (path: string) => {
    return (await orpc.filesystem.readFile({ path })) as {
      path: string;
      content: string | null;
    };
  },
  writeWorkspaceFile: async (path: string, content: string) => {
    return (await orpc.filesystem.writeFile({ path, content })) as {
      path: string;
      content: string;
    };
  },
  getSettings: async (): Promise<ControlSettings> => {
    return (await orpc.settings.get({})) as ControlSettings;
  },
  updateSettings: async (
    data: Partial<ControlSettings>,
  ): Promise<ControlSettings> => {
    return (await orpc.settings.update(data)) as ControlSettings;
  },
  exportPlatformData: async (): Promise<PlatformDataExport> => {
    const serverData = (await orpc.dataPortability.exportAll({})) as PlatformDataExport;
    return {
      ...serverData,
      clientStorage: collectPortableClientStorage(),
    };
  },
  importPlatformData: async (
    data: PlatformDataExport,
  ): Promise<PlatformDataImportResult> => {
    const { clientStorage: _clientStorage, ...serverData } = data;
    const result = (await orpc.dataPortability.importAll(serverData)) as PlatformDataImportResult;
    restorePortableClientStorage(data.clientStorage);
    return result;
  },
  listOrganizations: async (): Promise<Organization[]> => {
    return (await orpc.organizations.list({})) as Organization[];
  },
  createOrganization: (data: { name: string }): Promise<Organization> => {
    return orpc.organizations.create(data) as Promise<Organization>;
  },
  updateOrganization: (
    id: string,
    data: { name?: string },
  ): Promise<Organization> => {
    return orpc.organizations.update({ id, ...data }).then((organization) => {
      if (!organization) throw new Error("API error: 404");
      return organization as Organization;
    });
  },
  deleteOrganization: async (id: string): Promise<void> => {
    const result = await orpc.organizations.delete({ id });
    if (!result.success) throw new Error("API error: 404");
  },
  listProblems: async (filters?: {
    status?: ProblemStatus;
    priority?: ProblemPriority;
  }): Promise<Problem[]> => {
    return (await orpc.problems.list(filters ?? {})) as Problem[];
  },
  getProblemCounts: async (): Promise<Record<ProblemStatus, number>> => {
    return (await orpc.problems.counts({})) as Record<ProblemStatus, number>;
  },
  getProblemSummary: async (): Promise<ProblemSummary> => {
    return (await orpc.problems.summary({})) as ProblemSummary;
  },
  createProblem: (data: {
    title: string;
    priority?: ProblemPriority;
    source?: string;
    context?: string;
    actions?: string[];
  }): Promise<Problem> => {
    return orpc.problems.create(data) as Promise<Problem>;
  },
  updateProblem: (
    id: string,
    data: Partial<
      Pick<Problem, "title" | "priority" | "status" | "source" | "context">
    >,
  ): Promise<Problem> => {
    return orpc.problems.update({ id, ...data }).then((problem) => {
      if (!problem) throw new Error("API error: 404");
      return problem as Problem;
    });
  },
  deleteProblem: async (id: string): Promise<void> => {
    const result = await orpc.problems.delete({ id });
    if (!result.success) throw new Error("API error: 404");
  },
  bulkUpdateProblems: async (
    ids: string[],
    status: ProblemStatus,
  ): Promise<{ updated: number }> => {
    return (await orpc.problems.bulkUpdate({ ids, status })) as {
      updated: number;
    };
  },
  listInboxThreads: async (filters?: {
    kind?: InboxThreadKind;
    status?: InboxThreadStatus;
    projectId?: string;
    conversationId?: string;
  }): Promise<InboxThread[]> => {
    return ((await orpc.inbox.listThreads(filters ?? {})) as unknown[]).map(
      normalizeInboxThread,
    );
  },
  getInboxThread: async (id: string): Promise<InboxThread> => {
    const thread = await orpc.inbox.getThread({ id });
    if (!thread) throw new Error("API error: 404");
    return normalizeInboxThread(thread);
  },
  updateInboxThread: async (
    id: string,
    data: {
      title?: string;
      summary?: string;
      status?: InboxThreadStatus;
      priority?: InboxPriority;
      archived?: boolean;
    },
  ): Promise<InboxThread> => {
    const thread = await orpc.inbox.updateThread({ id, ...data });
    if (!thread) throw new Error("API error: 404");
    return normalizeInboxThread(thread);
  },
  listInboxMessages: async (threadId: string): Promise<InboxMessage[]> => {
    return (await orpc.inbox.listMessages({ threadId })) as InboxMessage[];
  },
  addInboxMessage: async (
    threadId: string,
    data: {
      messageType: InboxMessageType;
      senderType: "user" | "agent" | "system";
      senderId?: string;
      senderName: string;
      subject?: string;
      body: string;
      to?: string[];
      cc?: string[];
      problemId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<InboxMessage> => {
    return (await orpc.inbox.addMessage({ threadId, ...data })) as InboxMessage;
  },
  listBookmarks: async (): Promise<BookmarkCategory[]> => {
    return (await orpc.bookmarks.list({})) as BookmarkCategory[];
  },
  replaceBookmarks: async (
    categories: BookmarkCategory[],
  ): Promise<BookmarkCategory[]> => {
    return (await orpc.bookmarks.replaceAll({ categories })) as BookmarkCategory[];
  },
  organizeBookmarksWithAi: async (): Promise<BookmarkCategory[]> => {
    return (await orpc.bookmarks.organizeWithAi({})) as BookmarkCategory[];
  },
  createBookmarkCategory: async (name: string, icon?: string, color?: string): Promise<BookmarkCategory[]> => {
    return (await orpc.bookmarks.createCategory({ name, icon, color })) as BookmarkCategory[];
  },
  createBookmarkItem: async (
    categoryId: string,
    data: { title: string; url: string; icon?: string },
  ): Promise<BookmarkCategory[]> => {
    return (await orpc.bookmarks.createItem({
      categoryId,
      title: data.title,
      url: data.url,
      icon: data.icon,
    })) as BookmarkCategory[];
  },
  updateBookmarkCategory: async (
    id: string,
    data: { name?: string; icon?: string; color?: string },
  ): Promise<BookmarkCategory[]> => {
    return (await orpc.bookmarks.updateCategory({ id, ...data })) as BookmarkCategory[];
  },
  deleteBookmarkCategory: async (id: string): Promise<BookmarkCategory[]> => {
    return (await orpc.bookmarks.deleteCategory({ id })) as BookmarkCategory[];
  },
  updateBookmarkItem: async (
    categoryId: string,
    itemId: string,
    data: { title?: string; url?: string; pinned?: boolean; icon?: string | null },
  ): Promise<BookmarkCategory[]> => {
    return (await orpc.bookmarks.updateItem({
      categoryId,
      itemId,
      ...data,
    })) as BookmarkCategory[];
  },
  deleteBookmarkItem: async (
    categoryId: string,
    itemId: string,
  ): Promise<BookmarkCategory[]> => {
    return (await orpc.bookmarks.deleteItem({
      categoryId,
      itemId,
    })) as BookmarkCategory[];
  },
  moveBookmarkItem: async (
    bookmarkId: string,
    sourceCategoryId: string,
    targetCategoryId: string,
  ): Promise<BookmarkCategory[]> => {
    return (await orpc.bookmarks.moveItem({
      bookmarkId,
      sourceCategoryId,
      targetCategoryId,
    })) as BookmarkCategory[];
  },
  cacheBookmarkFavicon: async (
    bookmarkId: string,
    categoryId: string,
    url: string,
  ): Promise<BookmarkCategory[]> => {
    return (await orpc.bookmarks.cacheFavicon({
      bookmarkId,
      categoryId,
      url,
    })) as BookmarkCategory[];
  },
  listCustomAgents: async (): Promise<CustomAgent[]> => {
    return (await orpc.customAgents.list({})) as CustomAgent[];
  },
  getDefaultCustomAgentId: async (): Promise<string | null> => {
    const result = (await orpc.customAgents.getDefault({})) as { agentId: string | null };
    return result.agentId;
  },
  setDefaultCustomAgentId: async (agentId: string | null): Promise<string | null> => {
    const result = (await orpc.customAgents.setDefault({ agentId })) as { agentId: string | null };
    return result.agentId;
  },
  listCustomAgentModels: async (data: {
    url: string;
    apiKey: string;
  }): Promise<CustomAgentModelsResponse> => {
    return (await orpc.customAgents.models(data)) as CustomAgentModelsResponse;
  },
  createCustomAgent: async (data: {
    name: string;
    url: string;
    apiKey: string;
    model: string;
  }): Promise<CustomAgent[]> => {
    return (await orpc.customAgents.create(data)) as CustomAgent[];
  },
  updateCustomAgent: async (
    id: string,
    data: Partial<{
      name: string;
      url: string;
      apiKey: string;
      model: string;
    }>,
  ): Promise<CustomAgent[]> => {
    return (await orpc.customAgents.update({ id, ...data })) as CustomAgent[];
  },
  deleteCustomAgent: async (id: string): Promise<CustomAgent[]> => {
    return (await orpc.customAgents.delete({ id })) as CustomAgent[];
  },
  listConversations: async (): Promise<Conversation[]> => {
    return (await orpc.conversations.list({})) as Conversation[];
  },
  getConversation: async (id: string): Promise<Conversation> => {
    const conversation = (await orpc.conversations.get({ id })) as
      | Conversation
      | null;
    if (!conversation) throw new Error("API error: 404");
    return conversation;
  },
  createConversation: (data: {
    title?: string;
    projectId?: string;
    agentId?: string;
    runtimeId?: string;
    deleted?: boolean;
  }): Promise<Conversation> => orpc.conversations.create(data) as Promise<Conversation>,
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
  ): Promise<Conversation> => {
    return orpc.conversations.update({ id, ...data }).then((conversation) => {
      if (!conversation) throw new Error("API error: 404");
      return conversation as Conversation;
    });
  },
  deleteConversation: async (
    id: string,
    options?: { permanent?: boolean },
  ): Promise<void> => {
    const result = await orpc.conversations.delete({
      id,
      permanent: options?.permanent,
    });
    if (!result.success) throw new Error("API error: 404");
  },
  clearDeletedConversations: async (): Promise<{ count: number }> => {
    const result = await orpc.conversations.clearDeleted({});
    return { count: result.count };
  },
  getConversationMessages: async (id: string): Promise<ConversationMessage[]> => {
    return ((await orpc.conversations.listMessages({ id })) as unknown[]).map(
      normalizeConversationMessage,
    );
  },
  sendConversationMessage: async (
    id: string,
    content: string,
    customAgentId?: string,
  ): Promise<ConversationMessage> => {
    return normalizeConversationMessage(
      await orpc.conversations.sendMessage({ id, content, customAgentId }),
    );
  },
  retryConversationMessage: async (
    id: string,
    customAgentId?: string,
  ): Promise<ConversationMessage> => {
    return normalizeConversationMessage(
      await orpc.conversations.retryMessage({ id, customAgentId }),
    );
  },
  getObservabilityThroughput: async (
    timeRange: string,
  ): Promise<TimeSeriesPoint[]> => {
    return (await orpc.observability.throughput({
      range: timeRange as "24h" | "7d" | "30d",
    })) as TimeSeriesPoint[];
  },
  getObservabilityMetrics: async (
    timeRange: string,
  ): Promise<ObservabilityMetrics> => {
    return (await orpc.observability.metrics({
      range: timeRange as "24h" | "7d" | "30d",
    })) as ObservabilityMetrics;
  },
  getAgentMetrics: async (
    timeRange: string,
  ): Promise<AgentMetrics> => {
    return (await orpc.observability.agentMetrics({
      range: timeRange as "24h" | "7d" | "30d",
    })) as AgentMetrics;
  },
  getAgentTimeline: async (
    timeRange: string,
  ): Promise<AgentTimelinePoint[]> => {
    return (await orpc.observability.agentTimeline({
      range: timeRange as "24h" | "7d" | "30d",
    })) as AgentTimelinePoint[];
  },
  getActivityHeatmap: async (
    timeRange: string,
    metric: "messages" | "toolCalls" | "tokens" = "toolCalls",
  ): Promise<ActivityHeatmapPoint[]> => {
    return (await orpc.observability.activityHeatmap({
      range: timeRange as "24h" | "7d" | "30d",
      metric,
    })) as ActivityHeatmapPoint[];
  },

  // Subscription / Credits (pro feature — public returns null, private implements)
  getSubscription: async () => {
    return (await orpc.subscription.get({})) as unknown;
  },
  getCreditUsage: async (limit = 50, offset = 0) => {
    return (await orpc.subscription.usage({ limit, offset })) as unknown;
  },
};
