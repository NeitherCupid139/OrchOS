import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { RoutePending } from "@/components/layout/RoutePending";

export const Route = createFileRoute("/dashboard/board")({
  component: lazyRouteComponent(() => import("@/pages/dashboard/BoardPage"), "BoardPage"),
  pendingComponent: RoutePending,
});
