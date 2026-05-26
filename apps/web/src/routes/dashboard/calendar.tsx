import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/calendar")({
  component: lazyRouteComponent(
    () => import("@/pages/dashboard/CalendarPage"),
    "CalendarPage",
  ),
  pendingComponent: () => null,
});
