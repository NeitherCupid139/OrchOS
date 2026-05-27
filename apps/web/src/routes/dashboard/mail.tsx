import { createFileRoute } from "@tanstack/react-router";
import { MailPage } from "@/pages/dashboard/MailPage";

export const Route = createFileRoute("/dashboard/mail")({
  component: MailPage,
});
