import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { RoutePending } from "@/components/layout/RoutePending";

export const Route = createFileRoute("/dashboard/agents")({
  component: lazyRouteComponent(() => import("@/pages/dashboard/AgentsPage"), "AgentsPage"),
  pendingComponent: RoutePending,
});
