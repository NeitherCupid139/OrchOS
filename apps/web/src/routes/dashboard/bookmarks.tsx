import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/bookmarks")({
  component: lazyRouteComponent(
    () => import("@/pages/dashboard/BookmarksPage"),
    "BookmarksPage",
  ),
  pendingComponent: () => null,
});
