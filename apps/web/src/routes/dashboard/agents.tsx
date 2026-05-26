import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/agents")({
  component: lazyRouteComponent(
    () => import("@/pages/dashboard/AgentsPage"),
    "AgentsPage",
  ),
  pendingComponent: () => null,
});
