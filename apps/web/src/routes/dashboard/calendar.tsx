import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { RoutePending } from "@/components/layout/RoutePending";

export const Route = createFileRoute("/dashboard/calendar")({
  component: lazyRouteComponent(() => import("@/pages/dashboard/CalendarPage"), "CalendarPage"),
  pendingComponent: RoutePending,
});
