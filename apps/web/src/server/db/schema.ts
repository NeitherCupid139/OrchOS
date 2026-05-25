import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";

export const runtimes = sqliteTable("runtimes", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  command: text("command").notNull(),
  version: text("version"),
  path: text("path"),
  role: text("role").notNull(),
  capabilities: text("capabilities").notNull().default("[]"),
  model: text("model").notNull(),
  transport: text("transport").notNull().default("stdio"),
  enabled: text("enabled").notNull().default("true"),
  currentModel: text("current_model"),
  status: text("status").notNull().default("idle"),
  registryId: text("registry_id"),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  repositoryUrl: text("repository_url"),
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    payload: text("payload").notNull().default("{}"),
    timestamp: text("timestamp").notNull(),
  },
);

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const localAgents = sqliteTable(
  "local_agents",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    organizationId: text("organization_id").references(() => organizations.id),
    deviceId: text("device_id").notNull(),
    name: text("name").notNull(),
    hostToken: text("host_token").notNull(),
    platform: text("platform"),
    appVersion: text("app_version"),
    status: text("status").notNull().default("online"),
    runtimes: text("runtimes").notNull().default("[]"),
    metadata: text("metadata").notNull().default("{}"),
    registeredAt: text("registered_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
  },
  (t) => [
    index("idx_local_agents_user_id").on(t.userId),
    index("idx_local_agents_organization_id").on(t.organizationId),
    index("idx_local_agents_device_id").on(t.deviceId),
    index("idx_local_agents_last_seen_at").on(t.lastSeenAt),
  ],
);

export const localAgentPairings = sqliteTable(
  "local_agent_pairings",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id").notNull(),
    organizationId: text("organization_id").references(() => organizations.id),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_local_agent_pairings_user_id").on(t.userId),
    index("idx_local_agent_pairings_expires_at").on(t.expiresAt),
  ],
);

export const problems = sqliteTable(
  "problems",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    priority: text("priority").notNull().default("warning"),
    source: text("source"),
    context: text("context"),
    status: text("status").notNull().default("open"),
    actions: text("actions").notNull().default("[]"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_problems_status").on(t.status)],
);

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title"),
  projectId: text("project_id").references(() => projects.id),
  runtimeId: text("runtime_id").references(() => runtimes.id),
  archived: text("archived").notNull().default("false"),
  deleted: text("deleted").notNull().default("false"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    trace: text("trace"),
    error: text("error"),
    responseTime: text("response_time"),
    executionMode: text("execution_mode"),
    sandboxStatus: text("sandbox_status"),
    sandboxVmId: text("sandbox_vm_id"),
    projectId: text("project_id").references(() => projects.id),
    projectName: text("project_name"),
    clarificationQuestions: text("clarification_questions"),
    tokens: text("tokens"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_messages_conversation_id").on(t.conversationId)],
);

export const bookmarkCategories = sqliteTable(
  "bookmark_categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("folder"),
    color: text("color"),
    sortOrder: text("sort_order").notNull().default("0"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_bookmark_categories_sort_order").on(t.sortOrder)],
);

export const subscriptions = sqliteTable("subscriptions", {
  userId: text("user_id").primaryKey(),
  plan: text("plan").notNull().default("free"),
  creditsBalance: text("credits_balance").notNull().default("0"),
  creditsTotal: text("credits_total").notNull().default("0"),
  tokensUsed: text("tokens_used").notNull().default("0"),
  periodStart: text("period_start"),
  periodEnd: text("period_end"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const creditUsage = sqliteTable(
  "credit_usage",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    action: text("action").notNull(),
    tokens: text("tokens").notNull().default("0"),
    credits: text("credits").notNull().default("0"),
    metadata: text("metadata").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_credit_usage_user_id").on(t.userId),
    index("idx_credit_usage_action").on(t.action),
    index("idx_credit_usage_created_at").on(t.createdAt),
  ],
);

export const bookmarks = sqliteTable(
  "bookmarks",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => bookmarkCategories.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    icon: text("icon"),
    pinned: text("pinned").notNull().default("false"),
    sortOrder: text("sort_order").notNull().default("0"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("idx_bookmarks_category_id").on(t.categoryId),
    index("idx_bookmarks_sort_order").on(t.sortOrder),
  ],
);
