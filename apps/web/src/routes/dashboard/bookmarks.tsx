import { createFileRoute } from "@tanstack/react-router";
import { BookmarksPage } from "@/pages/dashboard/BookmarksPage";

export const Route = createFileRoute("/dashboard/bookmarks")({
  component: BookmarksPage,
});
