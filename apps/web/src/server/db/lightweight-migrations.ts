type D1LikeDatabase = {
  query?: (sql: string) => { all: () => Promise<unknown[]> };
  prepare?: (sql: string) => { all: () => Promise<{ results?: unknown[] } | unknown[]> };
  run?: (sql: string) => Promise<unknown>;
  exec?: (sql: string) => Promise<unknown>;
};

const LATEST_KNOWN_MIGRATION_MILLIS = 1778076000000;
const LATEST_KNOWN_MIGRATION_HASH = "bootstrap-current-schema";

export async function runLightweightMigrations(sqlite: D1LikeDatabase) {
  async function queryAll<T = unknown>(sql: string): Promise<T[]> {
    if (typeof sqlite.query === "function") {
      return (await sqlite.query(sql).all()) as T[];
    }

    if (typeof sqlite.prepare === "function") {
      const result = await sqlite.prepare(sql).all();
      if (Array.isArray(result)) {
        return result as T[];
      }
      return ((result as { results?: T[] }).results ?? []) as T[];
    }

    throw new Error("Unsupported SQLite client for lightweight migrations");
  }

  async function exec(sql: string) {
    const normalizedSql = sql.replace(/\s+/g, " ").trim();

    if (typeof sqlite.run === "function") {
      await sqlite.run(normalizedSql);
      return;
    }

    if (typeof sqlite.exec === "function") {
      await sqlite.exec(normalizedSql);
      return;
    }

    throw new Error("Unsupported SQLite client for lightweight migrations");
  }

  async function hasColumn(table: string, column: string): Promise<boolean> {
    const rows = await queryAll<{ name: string }>(`PRAGMA table_info("${table}")`);
    return rows.some((row) => row.name === column);
  }

  async function hasTable(table: string): Promise<boolean> {
    const rows = await queryAll(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`,
    );
    return rows.length > 0;
  }

  async function hasMigrationAtOrAfter(createdAt: number): Promise<boolean> {
    if (!(await hasTable("__drizzle_migrations"))) {
      return false;
    }

    const rows = await queryAll<{ created_at: number | string }>(
      'SELECT created_at FROM "__drizzle_migrations" ORDER BY created_at DESC LIMIT 1',
    );
    const latestCreatedAt = rows[0]?.created_at;
    return Number(latestCreatedAt ?? 0) >= createdAt;
  }

  async function ensureTable(sql: string) {
    await exec(sql);
  }

  async function ensureIndex(sql: string) {
    await exec(sql);
  }

  if (await hasTable("local_hosts") && !(await hasTable("local_agents"))) {
    await exec('ALTER TABLE "local_hosts" RENAME TO "local_agents"');
  }

  if (await hasTable("local_host_pairings") && !(await hasTable("local_agent_pairings"))) {
    await exec('ALTER TABLE "local_host_pairings" RENAME TO "local_agent_pairings"');
  }

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "commands" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "instruction" TEXT NOT NULL,
      "agent_names" TEXT NOT NULL DEFAULT '[]',
      "project_ids" TEXT NOT NULL DEFAULT '[]',
      "goal_id" TEXT,
      "status" TEXT NOT NULL DEFAULT 'sent',
      "created_at" TEXT NOT NULL
    )
  `);
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_commands_goal_id" ON "commands" ("goal_id")');

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "projects" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "path" TEXT NOT NULL,
      "repository_url" TEXT,
      "created_at" TEXT NOT NULL
    )
  `);

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "organizations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL
    )
  `);

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "settings" (
      "key" TEXT PRIMARY KEY NOT NULL,
      "value" TEXT NOT NULL
    )
  `);

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "goals" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "success_criteria" TEXT NOT NULL DEFAULT '[]',
      "constraints" TEXT NOT NULL DEFAULT '[]',
      "status" TEXT NOT NULL DEFAULT 'active',
      "project_id" TEXT,
      "command_id" TEXT,
      "watchers" TEXT NOT NULL DEFAULT '[]',
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL,
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON UPDATE no action ON DELETE no action,
      FOREIGN KEY ("command_id") REFERENCES "commands"("id") ON UPDATE no action ON DELETE no action
    )
  `);

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "states" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "goal_id" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "actions" TEXT,
      "updated_at" TEXT NOT NULL,
      FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON UPDATE no action ON DELETE cascade
    )
  `);
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_states_goal_id" ON "states" ("goal_id")');

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "artifacts" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "goal_id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "detail" TEXT,
      "updated_at" TEXT NOT NULL,
      FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON UPDATE no action ON DELETE cascade
    )
  `);
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_artifacts_goal_id" ON "artifacts" ("goal_id")');

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "activities" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "goal_id" TEXT NOT NULL,
      "timestamp" TEXT NOT NULL,
      "agent" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "detail" TEXT,
      "reasoning" TEXT,
      "diff" TEXT
    )
  `);
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_activities_goal_id" ON "activities" ("goal_id")');

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "runtimes" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "command" TEXT NOT NULL,
      "version" TEXT,
      "path" TEXT,
      "role" TEXT NOT NULL,
      "capabilities" TEXT NOT NULL DEFAULT '[]',
      "model" TEXT NOT NULL,
      "transport" TEXT NOT NULL DEFAULT 'stdio',
      "enabled" TEXT NOT NULL DEFAULT 'true',
      "current_model" TEXT,
      "status" TEXT NOT NULL DEFAULT 'idle',
      "registry_id" TEXT
    )
  `);
  await ensureIndex('CREATE UNIQUE INDEX IF NOT EXISTS "runtimes_name_unique" ON "runtimes" ("name")');

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "agents" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "capabilities" TEXT NOT NULL DEFAULT '[]',
      "status" TEXT NOT NULL DEFAULT 'idle',
      "model" TEXT NOT NULL,
      "enabled" TEXT NOT NULL DEFAULT 'true',
      "cli_command" TEXT,
      "current_model" TEXT,
      "runtime_id" TEXT,
      "avatar_url" TEXT,
      FOREIGN KEY ("runtime_id") REFERENCES "runtimes"("id") ON UPDATE no action ON DELETE no action
    )
  `);
  await ensureIndex('CREATE UNIQUE INDEX IF NOT EXISTS "agents_name_unique" ON "agents" ("name")');

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "events" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "type" TEXT NOT NULL,
      "goal_id" TEXT,
      "payload" TEXT NOT NULL DEFAULT '{}',
      "timestamp" TEXT NOT NULL
    )
  `);
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_events_goal_id" ON "events" ("goal_id")');

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "problems" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "title" TEXT NOT NULL,
      "priority" TEXT NOT NULL DEFAULT 'warning',
      "source" TEXT,
      "context" TEXT,
      "goal_id" TEXT,
      "state_id" TEXT,
      "status" TEXT NOT NULL DEFAULT 'open',
      "actions" TEXT NOT NULL DEFAULT '[]',
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL
    )
  `);
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_problems_status" ON "problems" ("status")');
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_problems_goal_id" ON "problems" ("goal_id")');

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "rules" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "condition" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "enabled" TEXT NOT NULL DEFAULT 'true',
      "created_at" TEXT NOT NULL
    )
  `);

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "mcp_servers" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "command" TEXT NOT NULL,
      "args" TEXT NOT NULL DEFAULT '[]',
      "env" TEXT NOT NULL DEFAULT '{}',
      "enabled" TEXT NOT NULL DEFAULT 'true',
      "scope" TEXT NOT NULL DEFAULT 'global',
      "project_id" TEXT,
      "organization_id" TEXT,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL,
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON UPDATE no action ON DELETE no action,
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON UPDATE no action ON DELETE no action
    )
  `);
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_mcp_servers_project_id" ON "mcp_servers" ("project_id")');
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_mcp_servers_organization_id" ON "mcp_servers" ("organization_id")');

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "conversations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "title" TEXT,
      "project_id" TEXT,
      "agent_id" TEXT,
      "runtime_id" TEXT,
      "archived" TEXT NOT NULL DEFAULT 'false',
      "deleted" TEXT NOT NULL DEFAULT 'false',
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL,
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON UPDATE no action ON DELETE no action,
      FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON UPDATE no action ON DELETE no action,
      FOREIGN KEY ("runtime_id") REFERENCES "runtimes"("id") ON UPDATE no action ON DELETE no action
    )
  `);

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "messages" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "conversation_id" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "error" TEXT,
      "response_time" TEXT,
      "created_at" TEXT NOT NULL,
      FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON UPDATE no action ON DELETE cascade
    )
  `);
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_messages_conversation_id" ON "messages" ("conversation_id")');

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "skills" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "enabled" TEXT NOT NULL DEFAULT 'true',
      "scope" TEXT NOT NULL DEFAULT 'global',
      "project_id" TEXT,
      "organization_id" TEXT,
      "source_type" TEXT NOT NULL DEFAULT 'manual',
      "source_url" TEXT,
      "install_path" TEXT,
      "manifest_path" TEXT,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL,
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON UPDATE no action ON DELETE no action,
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON UPDATE no action ON DELETE no action
    )
  `);
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_skills_project_id" ON "skills" ("project_id")');
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_skills_organization_id" ON "skills" ("organization_id")');

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "local_agents" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "user_id" TEXT NOT NULL,
      "organization_id" TEXT,
      "device_id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "host_token" TEXT NOT NULL,
      "platform" TEXT,
      "app_version" TEXT,
      "status" TEXT NOT NULL DEFAULT 'online',
      "runtimes" TEXT NOT NULL DEFAULT '[]',
      "metadata" TEXT NOT NULL DEFAULT '{}',
      "registered_at" TEXT NOT NULL,
      "last_seen_at" TEXT NOT NULL,
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON UPDATE no action ON DELETE no action
    )
  `);
  await exec('DROP INDEX IF EXISTS "idx_local_hosts_user_id"');
  await exec('DROP INDEX IF EXISTS "idx_local_hosts_organization_id"');
  await exec('DROP INDEX IF EXISTS "idx_local_hosts_device_id"');
  await exec('DROP INDEX IF EXISTS "idx_local_hosts_last_seen_at"');
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_local_agents_user_id" ON "local_agents" ("user_id")');
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_local_agents_organization_id" ON "local_agents" ("organization_id")');
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_local_agents_device_id" ON "local_agents" ("device_id")');
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_local_agents_last_seen_at" ON "local_agents" ("last_seen_at")');

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "local_agent_pairings" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "token" TEXT NOT NULL,
      "user_id" TEXT NOT NULL,
      "organization_id" TEXT,
      "expires_at" TEXT NOT NULL,
      "used_at" TEXT,
      "created_at" TEXT NOT NULL,
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON UPDATE no action ON DELETE no action
    )
  `);
  await exec('DROP INDEX IF EXISTS "idx_local_host_pairings_user_id"');
  await exec('DROP INDEX IF EXISTS "idx_local_host_pairings_expires_at"');
  await ensureIndex('CREATE UNIQUE INDEX IF NOT EXISTS "local_agent_pairings_token_unique" ON "local_agent_pairings" ("token")');
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_local_agent_pairings_user_id" ON "local_agent_pairings" ("user_id")');
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_local_agent_pairings_expires_at" ON "local_agent_pairings" ("expires_at")');

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "bookmark_categories" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "icon" TEXT NOT NULL DEFAULT 'folder',
      "sort_order" TEXT NOT NULL DEFAULT '0',
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL
    )
  `);
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_bookmark_categories_sort_order" ON "bookmark_categories" ("sort_order")');

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "bookmarks" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "category_id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "pinned" TEXT NOT NULL DEFAULT 'false',
      "sort_order" TEXT NOT NULL DEFAULT '0',
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL,
      FOREIGN KEY ("category_id") REFERENCES "bookmark_categories"("id") ON UPDATE no action ON DELETE cascade
    )
  `);
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_bookmarks_category_id" ON "bookmarks" ("category_id")');
  await ensureIndex('CREATE INDEX IF NOT EXISTS "idx_bookmarks_sort_order" ON "bookmarks" ("sort_order")');

  if (await hasTable("conversations") && !(await hasColumn("conversations", "archived"))) {
    await exec("ALTER TABLE conversations ADD COLUMN archived TEXT NOT NULL DEFAULT 'false'");
  }

  if (await hasTable("conversations") && !(await hasColumn("conversations", "deleted"))) {
    await exec("ALTER TABLE conversations ADD COLUMN deleted TEXT NOT NULL DEFAULT 'false'");
  }

  if (await hasTable("runtimes") && !(await hasColumn("runtimes", "transport"))) {
    await exec("ALTER TABLE runtimes ADD COLUMN transport TEXT NOT NULL DEFAULT 'stdio'");
  }

  if (await hasTable("runtimes") && !(await hasColumn("runtimes", "registry_id"))) {
    await exec("ALTER TABLE runtimes ADD COLUMN registry_id TEXT");
  }

  if (await hasTable("runtimes") && !(await hasColumn("runtimes", "current_model"))) {
    await exec("ALTER TABLE runtimes ADD COLUMN current_model TEXT");
  }

  if (await hasTable("local_agents") && !(await hasColumn("local_agents", "host_token"))) {
    await exec("ALTER TABLE local_agents ADD COLUMN host_token TEXT NOT NULL DEFAULT ''");
  }

  if (await hasTable("bookmark_categories") && !(await hasColumn("bookmark_categories", "icon"))) {
    await exec("ALTER TABLE bookmark_categories ADD COLUMN icon TEXT NOT NULL DEFAULT 'folder'");
  }

  if (await hasTable("bookmarks") && !(await hasColumn("bookmarks", "pinned"))) {
    await exec("ALTER TABLE bookmarks ADD COLUMN pinned TEXT NOT NULL DEFAULT 'false'");
  }

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "hash" TEXT NOT NULL,
      "created_at" NUMERIC
    )
  `);

  if (!(await hasMigrationAtOrAfter(LATEST_KNOWN_MIGRATION_MILLIS))) {
    await exec(`
      INSERT INTO "__drizzle_migrations" ("hash", "created_at")
      VALUES ('${LATEST_KNOWN_MIGRATION_HASH}', ${LATEST_KNOWN_MIGRATION_MILLIS})
    `);
  }
}
