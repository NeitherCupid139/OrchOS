import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import {
  bookmarkCategories,
  bookmarks,
  conversations,
  creditUsage,
  events,
  localAgentPairings,
  localAgents,
  messages,
  organizations,
  problems,
  projects,
  runtimes,
  settings,
  subscriptions,
} from "@/server/db/schema";
import type { AppDb } from "@/server/db/types";

type DataRow = Record<string, unknown>;

export interface PlatformDataExport {
  schemaVersion: 1;
  exportedAt: string;
  tables: Record<string, DataRow[]>;
}

export interface PlatformDataImportResult {
  success: true;
  importedAt: string;
  tables: Record<string, number>;
}

type PortableTable = {
  name: string;
  table: SQLiteTable;
};

const PORTABLE_TABLES: PortableTable[] = [
  { name: "runtimes", table: runtimes },
  { name: "projects", table: projects },
  { name: "settings", table: settings },
  { name: "events", table: events },
  { name: "organizations", table: organizations },
  { name: "localAgents", table: localAgents },
  { name: "localAgentPairings", table: localAgentPairings },
  { name: "problems", table: problems },
  { name: "conversations", table: conversations },
  { name: "messages", table: messages },
  { name: "bookmarkCategories", table: bookmarkCategories },
  { name: "subscriptions", table: subscriptions },
  { name: "creditUsage", table: creditUsage },
  { name: "bookmarks", table: bookmarks },
];

export class DataPortabilityService {
  constructor(private db: AppDb) {}

  async exportAll(): Promise<PlatformDataExport> {
    const tables: Record<string, DataRow[]> = {};

    for (const { name, table } of PORTABLE_TABLES) {
      tables[name] = (await this.db.select().from(table).all()) as DataRow[];
    }

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      tables,
    };
  }

  async importAll(data: PlatformDataExport): Promise<PlatformDataImportResult> {
    const importedCounts: Record<string, number> = {};

    for (const { name, table } of [...PORTABLE_TABLES].reverse()) {
      await this.db.delete(table).run();
      importedCounts[name] = 0;
    }

    for (const { name, table } of PORTABLE_TABLES) {
      const rows = data.tables[name] ?? [];
      importedCounts[name] = rows.length;

      if (rows.length === 0) {
        continue;
      }

      await this.db
        .insert(table)
        .values(rows as [Record<string, unknown>, ...Record<string, unknown>[]])
        .run();
    }

    return {
      success: true,
      importedAt: new Date().toISOString(),
      tables: importedCounts,
    };
  }
}
