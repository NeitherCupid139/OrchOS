import { useEffect, useRef } from "react";
import { sendNotification } from "@/lib/notifications";

/**
 * Watch for new assistant messages and dispatch browser notifications
 * when the user is on a different tab/window and notifications are enabled.
 */
export function useAssistantMessageNotification(
  messages: Array<{ id: string; role: string; content?: string }>,
  enabled: boolean,
) {
  const lastNotifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return;
    if (lastMessage.id === lastNotifiedRef.current) return;
    if (typeof document === "undefined" || !document.hidden) return;

    lastNotifiedRef.current = lastMessage.id;

    const preview = (lastMessage.content ?? "").slice(0, 120) || "New response";
    sendNotification("OrchOS — Assistant", {
      body: preview,
      icon: "/logo.svg",
      tag: `msg-${lastMessage.id}`,
    });
  }, [messages, enabled]);
}
