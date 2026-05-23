import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { RoutePending } from "@/components/layout/RoutePending";

export const Route = createFileRoute("/dashboard/creation")({
  component: lazyRouteComponent(() => import("@/pages/dashboard/CreationPage"), "CreationPage"),
  pendingComponent: RoutePending,
});
