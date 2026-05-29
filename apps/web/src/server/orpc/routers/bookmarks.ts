import { os } from "@/server/orpc/base";
import { BookmarkService } from "@/server/modules/bookmark/service";
import { getLocalDb } from "@/server/runtime/local-db";

export const bookmarksRouter = {
  list: os.bookmarks.list.handler(async () => {
    return BookmarkService.list(await getLocalDb());
  }),
  replaceAll: os.bookmarks.replaceAll.handler(async ({ input }) => {
    return BookmarkService.replaceAll(await getLocalDb(), input.categories);
  }),
  organizeWithAi: os.bookmarks.organizeWithAi.handler(async () => {
    return BookmarkService.organizeWithAi(await getLocalDb());
  }),
  createCategory: os.bookmarks.createCategory.handler(async ({ input }) => {
    return BookmarkService.createCategory(await getLocalDb(), input.name, input.icon, input.color);
  }),
  createItem: os.bookmarks.createItem.handler(async ({ input }) => {
    return BookmarkService.createBookmark(await getLocalDb(), input.categoryId, {
      title: input.title,
      url: input.url,
      icon: input.icon,
    });
  }),
  updateCategory: os.bookmarks.updateCategory.handler(async ({ input }) => {
    return BookmarkService.updateCategory(await getLocalDb(), input.id, {
      name: input.name,
      icon: input.icon,
      color: input.color,
    });
  }),
  deleteCategory: os.bookmarks.deleteCategory.handler(async ({ input }) => {
    return BookmarkService.deleteCategory(await getLocalDb(), input.id);
  }),
  updateItem: os.bookmarks.updateItem.handler(async ({ input }) => {
    return BookmarkService.updateBookmark(await getLocalDb(), input.categoryId, input.itemId, {
      title: input.title,
      url: input.url,
      pinned: input.pinned,
      icon: input.icon,
    });
  }),
  deleteItem: os.bookmarks.deleteItem.handler(async ({ input }) => {
    return BookmarkService.deleteBookmark(await getLocalDb(), input.categoryId, input.itemId);
  }),
  moveItem: os.bookmarks.moveItem.handler(async ({ input }) => {
    return BookmarkService.moveBookmark(
      await getLocalDb(),
      input.bookmarkId,
      input.sourceCategoryId,
      input.targetCategoryId,
    );
  }),
  cacheFavicon: os.bookmarks.cacheFavicon.handler(async ({ input }) => {
    return BookmarkService.cacheFavicon(
      await getLocalDb(),
      input.bookmarkId,
      input.categoryId,
      input.url,
    );
  }),
};
