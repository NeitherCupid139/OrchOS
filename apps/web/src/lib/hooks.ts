import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./api";
import { sendNotification } from "@/lib/notifications";

function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useSettings() {
  return useAsyncData(() => api.getSettings());
}

export function useProjects() {
  return useAsyncData(() => api.listProjects());
}

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
