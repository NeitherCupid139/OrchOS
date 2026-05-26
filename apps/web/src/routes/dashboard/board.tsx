import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/board")({
  component: lazyRouteComponent(
    () => import("@/pages/dashboard/BoardPage"),
    "BoardPage",
  ),
  pendingComponent: () => null,
});
