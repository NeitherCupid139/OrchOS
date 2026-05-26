import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/creation")({
  component: lazyRouteComponent(
    () => import("@/pages/dashboard/CreationPage"),
    "CreationPage",
  ),
  pendingComponent: () => null,
});
