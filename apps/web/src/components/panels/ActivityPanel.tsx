import { useCallback, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert01Icon,
  ComputerIcon,
  InformationCircleIcon,
  NotificationIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Event } from "@/lib/api.types";
import {
  activity_panel,
  no_notifications,
  no_notifications_desc,
} from "@/paraglide/messages";

const POLL_INTERVAL = 30_000;
const MAX_NOTIFICATIONS = 20;

interface ActivityPanelProps {
  collapsed: boolean;
  expanded?: boolean;
}

const EVENT_TYPE_META: Record<
  string,
  { label: string; icon: typeof InformationCircleIcon }
> = {
  agent_response: { label: "Agent", icon: ComputerIcon },
  agent_started: { label: "Agent", icon: ComputerIcon },
  agent_completed: { label: "Agent", icon: ComputerIcon },
  agent_error: { label: "Agent Error", icon: Alert01Icon },
  system: { label: "System", icon: InformationCircleIcon },
  system_update: { label: "System", icon: InformationCircleIcon },
  reminder: { label: "Reminder", icon: InformationCircleIcon },
  integration: { label: "Integration", icon: Tick02Icon },
};

function getEventMeta(type: string) {
  return (
    EVENT_TYPE_META[type] ?? {
      label: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      icon: InformationCircleIcon,
    }
  );
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function extractEventPreview(event: Event): {
  title: string;
  description?: string;
} {
  const typeMeta = getEventMeta(event.type);
  const payload = event.payload ?? {};

  if (typeof payload.title === "string") {
    return {
      title: payload.title,
      description:
        typeof payload.description === "string"
          ? payload.description
          : undefined,
    };
  }

  if (typeof payload.message === "string") {
    return { title: typeMeta.label, description: payload.message };
  }

  const content =
    typeof payload.content === "string"
      ? payload.content
      : typeof payload.summary === "string"
        ? payload.summary
        : null;

  if (content) {
    return { title: typeMeta.label, description: content };
  }

  return { title: typeMeta.label };
}

export function ActivityPanel({ collapsed, expanded }: ActivityPanelProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const metrics = await api.getObservabilityMetrics("24h");
      setEvents(metrics?.recentEvents?.slice(0, MAX_NOTIFICATIONS) ?? []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (collapsed) return;

    void fetchEvents();
    const interval = window.setInterval(fetchEvents, POLL_INTERVAL);
    return () => window.clearInterval(interval);
  }, [collapsed, fetchEvents]);

  if (collapsed) {
    return null;
  }

  const hasNotifications = events.length > 0;

  return (
    <aside
      className={cn(
        "flex h-full min-w-0 flex-col bg-sidebar transition-[border-color,box-shadow,opacity,transform] duration-320 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
        expanded
          ? "translate-x-0 opacity-100 shadow-[-24px_0_48px_-32px_hsl(var(--foreground)/0.22)] border-l border-transparent"
          : "translate-x-0 opacity-100 border-l border-border shadow-none",
      )}
    >
      <div className="flex h-11 items-center gap-2 border-b border-border bg-sidebar px-4">
        <div className="truncate text-sm font-medium text-foreground">{activity_panel()}</div>
      </div>

      <ScrollArea className="flex-1">
        {loading && events.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner size="sm" className="text-muted-foreground/50" />
          </div>
        ) : !hasNotifications ? (
          <div className="flex h-56 flex-col items-center justify-center px-4 text-center">
            <HugeiconsIcon
              icon={NotificationIcon}
              className="mb-3 size-8 text-muted-foreground/30"
            />
            <p className="text-sm font-medium text-muted-foreground">
              {no_notifications()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {no_notifications_desc()}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {events.map((event) => {
              const meta = getEventMeta(event.type);
              const preview = extractEventPreview(event);

              return (
                <div
                  key={event.id}
                  className="flex gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
                >
                  <div
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                      event.type.includes("error")
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <HugeiconsIcon icon={meta.icon} className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {preview.title}
                      </p>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/60">
                        {formatRelativeTime(event.timestamp)}
                      </span>
                    </div>
                    {preview.description ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {preview.description}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-[10px] text-muted-foreground/50">
                      {meta.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
