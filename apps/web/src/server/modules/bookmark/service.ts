import { asc, inArray } from "drizzle-orm";

import { bookmarkCategories, bookmarks } from "@/server/db/schema";
import type { AppDb } from "@/server/db/types";

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
}
