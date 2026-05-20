import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { RoutePending } from "@/components/layout/RoutePending";

export const Route = createFileRoute("/dashboard/bookmarks")({
  component: lazyRouteComponent(() => import("@/pages/dashboard/BookmarksPage"), "BookmarksPage"),
  pendingComponent: RoutePending,
});
