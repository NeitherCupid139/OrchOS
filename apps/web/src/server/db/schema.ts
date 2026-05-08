import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";

export const commands = sqliteTable(
  "commands",
  {
    id: text("id").primaryKey(),
    instruction: text("instruction").notNull(),
    agentNames: text("agent_names").notNull().default("[]"),
    projectIds: text("project_ids").notNull().default("[]"),
    goalId: text("goal_id"),
    status: text("status").notNull().default("sent"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_commands_goal_id").on(t.goalId)],
);

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  successCriteria: text("success_criteria").notNull().default("[]"),
  constraints: text("constraints").notNull().default("[]"),
  status: text("status").notNull().default("active"),
  projectId: text("project_id").references(() => projects.id),
  commandId: text("command_id").references(() => commands.id),
  watchers: text("watchers").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const states = sqliteTable(
  "states",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    status: text("status").notNull().default("pending"),
    actions: text("actions"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_states_goal_id").on(t.goalId)],
);

export const artifacts = sqliteTable(
  "artifacts",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull().default("pending"),
    detail: text("detail"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_artifacts_goal_id").on(t.goalId)],
);

export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id").notNull(),
    timestamp: text("timestamp").notNull(),
    agent: text("agent").notNull(),
    action: text("action").notNull(),
    detail: text("detail"),
    reasoning: text("reasoning"),
    diff: text("diff"),
  },
  (t) => [index("idx_activities_goal_id").on(t.goalId)],
);

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

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  role: text("role").notNull(),
  capabilities: text("capabilities").notNull().default("[]"),
  status: text("status").notNull().default("idle"),
  model: text("model").notNull(),
  enabled: text("enabled").notNull().default("true"),
  cliCommand: text("cli_command"),
  currentModel: text("current_model"),
  runtimeId: text("runtime_id").references(() => runtimes.id),
  avatarUrl: text("avatar_url"),
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
    goalId: text("goal_id"),
    payload: text("payload").notNull().default("{}"),
    timestamp: text("timestamp").notNull(),
  },
  (t) => [index("idx_events_goal_id").on(t.goalId)],
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
    goalId: text("goal_id"),
    stateId: text("state_id"),
    status: text("status").notNull().default("open"),
    actions: text("actions").notNull().default("[]"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_problems_status").on(t.status), index("idx_problems_goal_id").on(t.goalId)],
);

export const rules = sqliteTable("rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  condition: text("condition").notNull(),
  action: text("action").notNull(),
  enabled: text("enabled").notNull().default("true"),
  createdAt: text("created_at").notNull(),
});

export const mcpServers = sqliteTable(
  "mcp_servers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    command: text("command").notNull(),
    args: text("args").notNull().default("[]"),
    env: text("env").notNull().default("{}"),
    enabled: text("enabled").notNull().default("true"),
    scope: text("scope").notNull().default("global"), // "global" | "project"
    projectId: text("project_id").references(() => projects.id),
    organizationId: text("organization_id").references(() => organizations.id),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("idx_mcp_servers_project_id").on(t.projectId),
    index("idx_mcp_servers_organization_id").on(t.organizationId),
  ],
);

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title"),
  projectId: text("project_id").references(() => projects.id),
  agentId: text("agent_id").references(() => agents.id),
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
    error: text("error"),
    responseTime: text("response_time"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_messages_conversation_id").on(t.conversationId)],
);

export const skills = sqliteTable(
  "skills",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    enabled: text("enabled").notNull().default("true"),
    scope: text("scope").notNull().default("global"), // "global" | "project"
    projectId: text("project_id").references(() => projects.id),
    organizationId: text("organization_id").references(() => organizations.id),
    sourceType: text("source_type").notNull().default("manual"),
    sourceUrl: text("source_url"),
    installPath: text("install_path"),
    manifestPath: text("manifest_path"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("idx_skills_project_id").on(t.projectId),
    index("idx_skills_organization_id").on(t.organizationId),
  ],
);

export const bookmarkCategories = sqliteTable(
  "bookmark_categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("folder"),
    sortOrder: text("sort_order").notNull().default("0"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_bookmark_categories_sort_order").on(t.sortOrder)],
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
