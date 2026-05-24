import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { RoutePending } from "@/components/layout/RoutePending";

export const Route = createFileRoute("/dashboard/observability")({
  component: lazyRouteComponent(() => import("@/pages/dashboard/ObservabilityPage"), "ObservabilityPage"),
  pendingComponent: RoutePending,
});
