import { useState, useEffect, useCallback, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  NotificationIcon,
  InformationCircleIcon,
  Alert01Icon,
  ComputerIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Event } from "@/lib/api.types";
import { notifications, no_notifications, no_notifications_desc } from "@/paraglide/messages";

/** How often to poll for new notifications (ms) */
const POLL_INTERVAL = 30_000;

/** Maximum number of notifications to display */
const MAX_NOTIFICATIONS = 20;

/**
 * Map event types to display labels and icons.
 * Falls back to a generic "Event" label with info icon.
 */
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

/**
 * Try to extract a human-readable title and description from the event payload.
 */
function extractEventPreview(event: Event): {
  title: string;
  description?: string;
} {
  const typeMeta = getEventMeta(event.type);
  const p = event.payload ?? {};

  // Use explicit title/description fields if available
  if (typeof p.title === "string") {
    return { title: p.title, description: typeof p.description === "string" ? p.description : undefined };
  }
  if (typeof p.message === "string") {
    return { title: typeMeta.label, description: p.message };
  }

  // Try common payload shapes
  const content = typeof p.content === "string" ? p.content : typeof p.summary === "string" ? p.summary : null;
  if (content) {
    return { title: typeMeta.label, description: content };
  }

  return { title: typeMeta.label };
}

export function NotificationPopover() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const metrics = await api.getObservabilityMetrics("24h");
      if (metrics?.recentEvents) {
        setEvents(metrics.recentEvents.slice(0, MAX_NOTIFICATIONS));
      }
    } catch {
      // Silently fail — notification panel is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling when open
  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (open) {
      void fetchEvents();
      pollRef.current = setInterval(fetchEvents, POLL_INTERVAL);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [open, fetchEvents]);

  const hasNotifications = events.length > 0;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => setOpen(next)}
      modal={false}
    >
      <DropdownMenuTrigger
        className="relative inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
        aria-label={notifications()}
      >
        <HugeiconsIcon icon={NotificationIcon} className="size-5" />
        {hasNotifications && !loading && (
          <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold leading-none text-destructive-foreground">
            {events.length > 99 ? "99+" : events.length}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 max-h-[420px] overflow-y-auto p-0"
        disableAnimation
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-popover px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            {notifications()}
          </h3>
        </div>

        {/* Content */}
        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground/60" />
          </div>
        ) : !hasNotifications ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
