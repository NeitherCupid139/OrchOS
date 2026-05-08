import type { AppDb } from "./types";

export function runLightweightMigrations(db: AppDb) {
  const sqlite = (db as any).$client;

  function queryAll<T = unknown>(sql: string) {
    if (typeof sqlite.query === "function") {
      return sqlite.query(sql).all() as T[];
    }

    if (typeof sqlite.prepare === "function") {
      return sqlite.prepare(sql).all() as T[];
    }

    throw new Error("Unsupported SQLite client for lightweight migrations");
  }

  function exec(sql: string) {
    if (typeof sqlite.run === "function") {
      sqlite.run(sql);
      return;
    }

    if (typeof sqlite.exec === "function") {
      sqlite.exec(sql);
      return;
    }

    throw new Error("Unsupported SQLite client for lightweight migrations");
  }

  function hasColumn(table: string, column: string): boolean {
    const rows = queryAll<{ name: string }>(`PRAGMA table_info("${table}")`);
    return rows.some((row) => row.name === column);
  }

  function hasTable(table: string): boolean {
    const rows = queryAll(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`,
    );
    return rows.length > 0;
  }

  if (hasTable("conversations") && !hasColumn("conversations", "archived")) {
    exec("ALTER TABLE conversations ADD COLUMN archived TEXT NOT NULL DEFAULT 'false'");
  }

  if (hasTable("conversations") && !hasColumn("conversations", "deleted")) {
    exec("ALTER TABLE conversations ADD COLUMN deleted TEXT NOT NULL DEFAULT 'false'");
  }

  if (hasTable("runtimes") && !hasColumn("runtimes", "transport")) {
    exec("ALTER TABLE runtimes ADD COLUMN transport TEXT NOT NULL DEFAULT 'stdio'");
  }

  if (hasTable("runtimes") && !hasColumn("runtimes", "registry_id")) {
    exec("ALTER TABLE runtimes ADD COLUMN registry_id TEXT");
  }

  if (hasTable("runtimes") && !hasColumn("runtimes", "current_model")) {
    exec("ALTER TABLE runtimes ADD COLUMN current_model TEXT");
  }

  if (!hasTable("local_hosts")) {
    exec(`
      CREATE TABLE "local_hosts" (
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
    exec("CREATE INDEX \"idx_local_hosts_user_id\" ON \"local_hosts\" (\"user_id\")");
    exec("CREATE INDEX \"idx_local_hosts_organization_id\" ON \"local_hosts\" (\"organization_id\")");
    exec("CREATE INDEX \"idx_local_hosts_device_id\" ON \"local_hosts\" (\"device_id\")");
    exec("CREATE INDEX \"idx_local_hosts_last_seen_at\" ON \"local_hosts\" (\"last_seen_at\")");
  }

  if (hasTable("local_hosts") && !hasColumn("local_hosts", "host_token")) {
    exec("ALTER TABLE local_hosts ADD COLUMN host_token TEXT NOT NULL DEFAULT ''");
  }

  if (!hasTable("local_host_pairings")) {
    exec(`
      CREATE TABLE "local_host_pairings" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "user_id" TEXT NOT NULL,
        "organization_id" TEXT,
        "expires_at" TEXT NOT NULL,
        "used_at" TEXT,
        "created_at" TEXT NOT NULL,
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON UPDATE no action ON DELETE no action
      )
    `);
    exec("CREATE INDEX \"idx_local_host_pairings_user_id\" ON \"local_host_pairings\" (\"user_id\")");
    exec("CREATE INDEX \"idx_local_host_pairings_expires_at\" ON \"local_host_pairings\" (\"expires_at\")");
  }

  if (!hasTable("bookmark_categories")) {
    exec(`
      CREATE TABLE "bookmark_categories" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "name" TEXT NOT NULL,
        "icon" TEXT NOT NULL DEFAULT 'folder',
        "sort_order" TEXT NOT NULL DEFAULT '0',
        "created_at" TEXT NOT NULL,
        "updated_at" TEXT NOT NULL
      )
    `);
    exec("CREATE INDEX \"idx_bookmark_categories_sort_order\" ON \"bookmark_categories\" (\"sort_order\")");
  }

  if (hasTable("bookmark_categories") && !hasColumn("bookmark_categories", "icon")) {
    exec("ALTER TABLE bookmark_categories ADD COLUMN icon TEXT NOT NULL DEFAULT 'folder'");
  }

  if (!hasTable("bookmarks")) {
    exec(`
      CREATE TABLE "bookmarks" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "category_id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "sort_order" TEXT NOT NULL DEFAULT '0',
        "created_at" TEXT NOT NULL,
        "updated_at" TEXT NOT NULL,
        FOREIGN KEY ("category_id") REFERENCES "bookmark_categories"("id") ON UPDATE no action ON DELETE cascade
      )
    `);
    exec("CREATE INDEX \"idx_bookmarks_category_id\" ON \"bookmarks\" (\"category_id\")");
    exec("CREATE INDEX \"idx_bookmarks_sort_order\" ON \"bookmarks\" (\"sort_order\")");
  }

  if (hasTable("bookmarks") && !hasColumn("bookmarks", "pinned")) {
    exec("ALTER TABLE bookmarks ADD COLUMN pinned TEXT NOT NULL DEFAULT 'false'");
  }
}
