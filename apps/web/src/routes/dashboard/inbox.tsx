import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useUIStore } from "@/lib/store";
import { useConversationStore } from "@/lib/stores/conversation";
import { redirecting_to_creation } from "@/paraglide/messages";

export const Route = createFileRoute("/dashboard/inbox")({ component: InboxPage });

function InboxPage() {
  const navigate = useNavigate();
  const { activeConversationId } = useConversationStore();
  const { setActiveGoalId } = useUIStore();

  useEffect(() => {
    if (!activeConversationId) {
      void navigate({ to: "/dashboard/creation", replace: true });
      return;
    }

    setActiveGoalId(null);
    void navigate({ to: "/dashboard/creation", replace: true });
  }, [activeConversationId, navigate, setActiveGoalId]);

  return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-background text-sm text-muted-foreground">
        {redirecting_to_creation()}
      </div>
  );
}
