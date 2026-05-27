import { createFileRoute } from "@tanstack/react-router";
import { CreationPage } from "@/pages/dashboard/CreationPage";

export const Route = createFileRoute("/dashboard/creation")({
  component: CreationPage,
});
