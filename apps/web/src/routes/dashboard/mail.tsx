import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { RoutePending } from "@/components/layout/RoutePending";

export const Route = createFileRoute("/dashboard/mail")({
  component: lazyRouteComponent(() => import("@/pages/dashboard/MailPage"), "MailPage"),
  pendingComponent: RoutePending,
});
