import { oc } from "@orpc/contract";
import { z } from "zod";

export const bookmarkItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  pinned: z.boolean(),
  icon: z.string().optional(),
});

export const bookmarkCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  color: z.string().optional(),
  bookmarks: z.array(bookmarkItemSchema),
});

export const bookmarksContract = {
  list: oc.input(z.object({}).optional()).output(z.array(bookmarkCategorySchema)),
  replaceAll: oc
    .input(z.object({ categories: z.array(bookmarkCategorySchema) }))
    .output(z.array(bookmarkCategorySchema)),
  createCategory: oc.input(z.object({ name: z.string(), icon: z.string().optional(), color: z.string().optional() })).output(z.array(bookmarkCategorySchema)),
  createItem: oc
    .input(
      z.object({
        categoryId: z.string(),
        title: z.string(),
        url: z.string(),
        icon: z.string().optional(),
      }),
    )
    .output(z.array(bookmarkCategorySchema)),
  updateCategory: oc
    .input(z.object({ id: z.string(), name: z.string().optional(), icon: z.string().optional(), color: z.string().optional() }))
    .output(z.array(bookmarkCategorySchema)),
  deleteCategory: oc.input(z.object({ id: z.string() })).output(z.array(bookmarkCategorySchema)),
  updateItem: oc
    .input(
      z.object({
        categoryId: z.string(),
        itemId: z.string(),
        title: z.string().optional(),
        url: z.string().optional(),
        pinned: z.boolean().optional(),
        icon: z.string().nullable().optional(),
      }),
    )
    .output(z.array(bookmarkCategorySchema)),
  deleteItem: oc
    .input(z.object({ categoryId: z.string(), itemId: z.string() }))
    .output(z.array(bookmarkCategorySchema)),
  moveItem: oc
    .input(
      z.object({
        bookmarkId: z.string(),
        sourceCategoryId: z.string(),
        targetCategoryId: z.string(),
      }),
    )
    .output(z.array(bookmarkCategorySchema)),
};
