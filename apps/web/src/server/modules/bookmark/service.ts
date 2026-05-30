import { asc, inArray } from "drizzle-orm";
import { generateObject } from "ai";
import { z } from "zod";

import { bookmarkCategories, bookmarks } from "@/server/db/schema";
import type { AppDb } from "@/server/db/types";
import { getAIGatewayConfig } from "@/server/ai-gateway";
import type { AIGatewayConfig } from "@orchos/pro/ai-gateway";
import { createModelFromAgent } from "@/server/ai/provider";
import { CustomAgentService } from "@/server/modules/custom-agents/service";
import { getBuiltInAgent } from "@/lib/built-in-agent";

type BookmarkItem = {
  id: string;
  title: string;
  url: string;
  pinned: boolean;
  icon?: string;
};

export type BookmarkCategoryRecord = {
  id: string;
  name: string;
  icon: string;
  color?: string;
  bookmarks: BookmarkItem[];
};

function generateId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const bookmarkOrganizationSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string().min(1).max(48),
      bookmarkIds: z.array(z.string()),
    }),
  ),
});

function normalizeCategoryName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 48);
}

function categoryKey(name: string) {
  return normalizeCategoryName(name).toLowerCase();
}

async function getBookmarkAgentModelInput(
  db: AppDb,
  agentId?: string | null,
): Promise<{
  url?: string;
  apiKey?: string;
  model: string;
  gatewayConfig?: AIGatewayConfig | null;
}> {
  const gatewayConfig = await getAIGatewayConfig();

  // null explicitly means use built-in agent
  if (agentId === null) {
    const builtIn = getBuiltInAgent();
    return { model: builtIn.model, gatewayConfig };
  }

  // Specific custom agent ID
  if (agentId) {
    const customAgentService = new CustomAgentService(db);
    const agents = await customAgentService.list();
    const agent = agents.find((item) => item.id === agentId);

    if (agent) {
      return {
        url: agent.url,
        apiKey: agent.apiKey,
        model: agent.model,
        gatewayConfig,
      };
    }
    // Agent not found — fall through to default
  }

  // undefined — use system default agent (original behavior)
  const customAgentService = new CustomAgentService(db);
  const defaultAgentId = await customAgentService.getDefaultAgentId();

  if (defaultAgentId) {
    const agents = await customAgentService.list();
    const agent = agents.find((item) => item.id === defaultAgentId);

    if (agent) {
      return {
        url: agent.url,
        apiKey: agent.apiKey,
        model: agent.model,
        gatewayConfig,
      };
    }
  }

  const builtIn = getBuiltInAgent();
  return { model: builtIn.model, gatewayConfig };
}

// ─── Page metadata fetcher (lightweight RAG) ───────────────────────────

interface PageMetadata {
  pageTitle?: string;
  pageDescription?: string;
}

const METADATA_FETCH_TIMEOUT_MS = 4000;
const METADATA_FETCH_CONCURRENCY = 5;

/**
 * Fetch and extract page metadata (title + description) from a URL.
 * Uses regex-based extraction to avoid DOM parser dependencies in Workers.
 * Returns null on any failure — the caller falls back to bookmark title/URL.
 */
async function fetchPageMetadata(url: string): Promise<PageMetadata | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(METADATA_FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "OrchOS/1.0 (bookmark-organizer)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    // Only read first 128KB — enough for head metadata
    const reader = response.body?.getReader();
    if (!reader) return null;

    let html = "";
    const decoder = new TextDecoder();
    const maxBytes = 128 * 1024;

    try {
      while (html.length < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
      }
    } finally {
      reader.cancel();
    }

    // Extract <title>
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const rawTitle = titleMatch?.[1]?.trim();

    // Extract og:title
    const ogTitleMatch =
      html.match(
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i,
      ) ??
      html.match(
        /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i,
      );
    const ogTitle = ogTitleMatch?.[1]?.trim();

    // Extract meta description
    const descMatch =
      html.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
      ) ??
      html.match(
        /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
      );
    const metaDescription = descMatch?.[1]?.trim();

    // Extract og:description
    const ogDescMatch =
      html.match(
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i,
      ) ??
      html.match(
        /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i,
      );
    const ogDescription = ogDescMatch?.[1]?.trim();

    const result: PageMetadata = {};

    // Decode common HTML entities
    const decode = (s: string) =>
      s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'");

    // Prefer og:title over <title>, as og:title is usually more descriptive
    const bestTitle = ogTitle || rawTitle;
    if (bestTitle) {
      result.pageTitle = decode(bestTitle).slice(0, 200);
    }

    const bestDescription = ogDescription || metaDescription;
    if (bestDescription) {
      result.pageDescription = decode(bestDescription).slice(0, 300);
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

/**
 * Fetch page metadata for multiple URLs with concurrency limiting.
 * Returns a Map keyed by URL. Failed fetches are silently excluded.
 */
async function fetchAllPagesMetadata(
  urls: string[],
): Promise<Map<string, PageMetadata>> {
  const results = new Map<string, PageMetadata>();
  const uniqueUrls = [...new Set(urls)];

  for (let i = 0; i < uniqueUrls.length; i += METADATA_FETCH_CONCURRENCY) {
    const batch = uniqueUrls.slice(i, i + METADATA_FETCH_CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (url) => {
        const metadata = await fetchPageMetadata(url);
        if (metadata) {
          results.set(url, metadata);
        }
      }),
    );
    // Log failures at debug level — they're expected for dead/blocked links
    for (let j = 0; j < batchResults.length; j++) {
      const r = batchResults[j];
      if (r.status === "rejected") {
        console.debug(
          `[bookmarks] metadata fetch failed for ${batch[j]}:`,
          r.reason,
        );
      }
    }
  }

  return results;
}

// ─── BookmarkService ───────────────────────────────────────────────────

export abstract class BookmarkService {
  static async list(db: AppDb): Promise<BookmarkCategoryRecord[]> {
    const [categoryRows, bookmarkRows] = await Promise.all([
      db.select().from(bookmarkCategories).orderBy(asc(bookmarkCategories.sortOrder)).all(),
      db.select().from(bookmarks).orderBy(asc(bookmarks.sortOrder)).all(),
    ]);

    return categoryRows.map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color ?? undefined,
      bookmarks: bookmarkRows
        .flatMap((bookmark) => bookmark.categoryId === category.id ? [{
          id: bookmark.id,
          title: bookmark.title,
          url: bookmark.url,
          pinned: bookmark.pinned === "true",
          icon: bookmark.icon ?? undefined,
        }] : []),
    }));
  }

  static async replaceAll(db: AppDb, categories: BookmarkCategoryRecord[]) {
    const now = new Date().toISOString();

    const existingCategories = await db.select().from(bookmarkCategories).all();
    if (existingCategories.length > 0) {
      await db.delete(bookmarkCategories).where(inArray(bookmarkCategories.id, existingCategories.map((category) => category.id))).run();
    }

    const insertPromises: Promise<unknown>[] = [];
    for (const [categoryIndex, category] of categories.entries()) {
      insertPromises.push(
        db.insert(bookmarkCategories).values({
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color ?? null,
          sortOrder: String(categoryIndex),
          createdAt: now,
          updatedAt: now,
        }).run(),
      );
    }
    await Promise.all(insertPromises);

    const bookmarkPromises: Promise<unknown>[] = [];
    for (const category of categories) {
      for (const [bookmarkIndex, bookmark] of category.bookmarks.entries()) {
        bookmarkPromises.push(
          db.insert(bookmarks).values({
            id: bookmark.id,
            categoryId: category.id,
            title: bookmark.title,
            url: bookmark.url,
            icon: bookmark.icon ?? null,
            pinned: bookmark.pinned ? "true" : "false",
            sortOrder: String(bookmarkIndex),
            createdAt: now,
            updatedAt: now,
          }).run(),
        );
      }
    }
    await Promise.all(bookmarkPromises);

    // D1 is eventually consistent — retry list a few times
    // in case the read replica hasn't caught up yet
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      const result = await BookmarkService.list(db);
      if (result.length > 0 || categories.length === 0) {
        return result;
      }
    }

    return BookmarkService.list(db);
  }

  static async createCategory(db: AppDb, name: string, icon = "folder", color?: string) {
    const categories = await BookmarkService.list(db);
    const category: BookmarkCategoryRecord = {
      id: generateId("bookmark_category"),
      name,
      icon,
      color,
      bookmarks: [],
    };

    return BookmarkService.replaceAll(db, [...categories, category]);
  }

  static async updateCategory(db: AppDb, id: string, data: { name?: string; icon?: string; color?: string }) {
    const categories = await BookmarkService.list(db);
    return BookmarkService.replaceAll(
      db,
      categories.map((category) =>
        category.id === id
          ? {
              ...category,
              name: data.name ?? category.name,
              icon: data.icon ?? category.icon,
              color: data.color !== undefined ? data.color : category.color,
            }
          : category,
      ),
    );
  }

  static async deleteCategory(db: AppDb, id: string) {
    const categories = await BookmarkService.list(db);
    return BookmarkService.replaceAll(
      db,
      categories.filter((category) => category.id !== id),
    );
  }

  static async updateBookmark(db: AppDb, categoryId: string, bookmarkId: string, data: { title?: string; url?: string; pinned?: boolean; icon?: string | null }) {
    const categories = await BookmarkService.list(db);
    return BookmarkService.replaceAll(
      db,
      categories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              bookmarks: category.bookmarks.map((bookmark) =>
                bookmark.id === bookmarkId
                  ? {
                      ...bookmark,
                      ...(data.title !== undefined ? { title: data.title } : {}),
                      ...(data.url !== undefined ? { url: data.url } : {}),
                      ...(data.pinned !== undefined ? { pinned: data.pinned } : {}),
                      ...(data.icon !== undefined ? { icon: data.icon ?? undefined } : {}),
                    }
                  : bookmark,
              ),
            }
          : category,
      ),
    );
  }

  static async createBookmark(db: AppDb, categoryId: string, data: { title: string; url: string; icon?: string }) {
    const categories = await BookmarkService.list(db);
    return BookmarkService.replaceAll(
      db,
      categories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              bookmarks: [
                ...category.bookmarks,
                {
                  id: generateId("bookmark"),
                  title: data.title,
                  url: data.url,
                  pinned: false,
                  icon: data.icon,
                },
              ],
            }
          : category,
      ),
    );
  }

  static async moveBookmark(db: AppDb, bookmarkId: string, sourceCategoryId: string, targetCategoryId: string) {
    if (sourceCategoryId === targetCategoryId) {
      return BookmarkService.list(db);
    }

    const categories = await BookmarkService.list(db);
    const sourceCategory = categories.find((category) => category.id === sourceCategoryId);
    const bookmark = sourceCategory?.bookmarks.find((item) => item.id === bookmarkId);
    if (!bookmark) {
      return categories;
    }

    return BookmarkService.replaceAll(
      db,
      categories.map((category) => {
        if (category.id === sourceCategoryId) {
          return {
            ...category,
            bookmarks: category.bookmarks.filter((item) => item.id !== bookmarkId),
          };
        }

        if (category.id === targetCategoryId) {
          return {
            ...category,
            bookmarks: [...category.bookmarks, bookmark],
          };
        }

        return category;
      }),
    );
  }

  static async cacheFavicon(db: AppDb, bookmarkId: string, categoryId: string, url: string): Promise<BookmarkCategoryRecord[]> {
    let domain: string | null = null;
    try {
      domain = new URL(url).hostname;
    } catch {}

    if (!domain) {
      return BookmarkService.list(db);
    }

    try {
      const response = await fetch(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
      if (!response.ok) {
        return BookmarkService.list(db);
      }

      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const dataUrl = `data:${blob.type || "image/x-icon"};base64,${base64}`;

      return BookmarkService.updateBookmark(db, categoryId, bookmarkId, { icon: dataUrl });
    } catch {
      return BookmarkService.list(db);
    }
  }

  static async deleteBookmark(db: AppDb, categoryId: string, bookmarkId: string) {
    const categories = await BookmarkService.list(db);
    return BookmarkService.replaceAll(
      db,
      categories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              bookmarks: category.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId),
            }
          : category,
      ),
    );
  }

  static async organizeWithAi(
    db: AppDb,
    agentId?: string | null,
  ): Promise<BookmarkCategoryRecord[]> {
    const categories = await BookmarkService.list(db);
    const flatBookmarks = categories.flatMap((category) =>
      category.bookmarks.map((bookmark) => ({
        ...bookmark,
        currentCategory: category.name,
      })),
    );

    if (flatBookmarks.length === 0) {
      return categories;
    }

    // Fetch page metadata from bookmark URLs (lightweight RAG).
    // Runs concurrently with the model init to reduce latency.
    const metadataPromise = fetchAllPagesMetadata(
      flatBookmarks.map((b) => b.url),
    );

    const languageModel = await createModelFromAgent(
      await getBookmarkAgentModelInput(db, agentId),
    );

    const metadataMap = await metadataPromise;

    const { object } = await generateObject({
      model: languageModel,
      schema: bookmarkOrganizationSchema,
      system:
        "You organize browser bookmarks into useful folders. Return only category names and bookmark IDs. Do not invent bookmark IDs. Keep every category practical and concise.",
      prompt: [
        "Group these bookmarks into useful folders.",
        "You may create new folders, merge old folders, or keep existing folders if they still make sense.",
        "Prefer category names in the same language/style as the existing category names.",
        "Every bookmark should appear in exactly one folder.",
        "Use the pageTitle and pageDescription (when available) to understand what each page is actually about — they are more reliable than the bookmark title alone.",
        "",
        JSON.stringify(
          flatBookmarks.map((bookmark) => {
            const metadata = metadataMap.get(bookmark.url);
            const enriched: Record<string, unknown> = {
              id: bookmark.id,
              title: bookmark.title,
              url: bookmark.url,
              currentCategory: bookmark.currentCategory,
            };
            if (metadata?.pageTitle && metadata.pageTitle !== bookmark.title) {
              enriched.pageTitle = metadata.pageTitle;
            }
            if (metadata?.pageDescription) {
              enriched.pageDescription = metadata.pageDescription;
            }
            return enriched;
          }),
        ),
      ].join("\n"),
      temperature: 0.2,
    });

    const bookmarksById = new Map(
      flatBookmarks.map((bookmark) => [bookmark.id, bookmark]),
    );
    const existingCategoriesByName = new Map(
      categories.map((category) => [categoryKey(category.name), category]),
    );
    const usedBookmarkIds = new Set<string>();
    const organizedByName = new Map<string, BookmarkCategoryRecord>();

    function appendCategory(name: string, nextBookmarks: BookmarkItem[]) {
      const normalizedName = normalizeCategoryName(name);
      if (!normalizedName || nextBookmarks.length === 0) {
        return;
      }

      const key = categoryKey(normalizedName);
      const existing =
        organizedByName.get(key) ?? existingCategoriesByName.get(key);
      const category: BookmarkCategoryRecord = organizedByName.get(key) ?? {
        id: existing?.id ?? generateId("bookmark_category"),
        name: existing?.name ?? normalizedName,
        icon: existing?.icon ?? "folder",
        color: existing?.color,
        bookmarks: [],
      };

      category.bookmarks.push(...nextBookmarks);
      organizedByName.set(key, category);
    }

    for (const proposedCategory of object.categories) {
      const nextBookmarks: BookmarkItem[] = [];

      for (const bookmarkId of proposedCategory.bookmarkIds) {
        const bookmark = bookmarksById.get(bookmarkId);
        if (!bookmark || usedBookmarkIds.has(bookmarkId)) {
          continue;
        }

        usedBookmarkIds.add(bookmarkId);
        nextBookmarks.push({
          id: bookmark.id,
          title: bookmark.title,
          url: bookmark.url,
          pinned: bookmark.pinned,
          icon: bookmark.icon,
        });
      }

      appendCategory(proposedCategory.name, nextBookmarks);
    }

    const remainingBookmarks = flatBookmarks
      .filter((bookmark) => !usedBookmarkIds.has(bookmark.id))
      .map((bookmark) => ({
        id: bookmark.id,
        title: bookmark.title,
        url: bookmark.url,
        pinned: bookmark.pinned,
        icon: bookmark.icon,
      }));

    appendCategory("Unsorted", remainingBookmarks);

    const organizedCategories = Array.from(organizedByName.values());
    if (organizedCategories.length === 0) {
      return categories;
    }

    return BookmarkService.replaceAll(db, organizedCategories);
  }
}
