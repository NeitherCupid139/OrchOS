import { createFileRoute } from "@tanstack/react-router";
import { AgentsPage } from "@/pages/dashboard/AgentsPage";

export const Route = createFileRoute("/dashboard/agents")({
  component: AgentsPage,
});
