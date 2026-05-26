import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/observability")({
  loader: () => {
    throw redirect({ to: "/dashboard/agents", search: { view: "observability" } });
  },
});
