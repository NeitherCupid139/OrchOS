import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/mail")({
  component: lazyRouteComponent(
    () => import("@/pages/dashboard/MailPage"),
    "MailPage",
  ),
  pendingComponent: () => null,
});
