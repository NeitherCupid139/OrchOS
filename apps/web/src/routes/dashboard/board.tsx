import { createFileRoute } from "@tanstack/react-router";
import { BoardPage } from "@/pages/dashboard/BoardPage";

export const Route = createFileRoute("/dashboard/board")({
  component: BoardPage,
});
