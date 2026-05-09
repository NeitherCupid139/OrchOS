import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GitPullRequestIcon,
  SquareIcon,
  InformationCircleIcon,
  Robot02Icon,
  Target01Icon,
  ViewOffIcon,
  CheckmarkBadge01Icon,
  InboxIcon,
} from "@hugeicons/core-free-icons";
import { m } from "@/paraglide/messages";
import type { Problem, InboxSource } from "@/lib/types";
import { isInboxItem } from "@/lib/types";

// --- Mock Data ---
const mockProblems: Problem[] = [
  {
    id: "p-1",
    title: "Fix memory leak in agent worker pool",
    priority: "critical",
    source: "github_pr",
    context:
      "PR #142 introduces a connection pool for agent workers. The pool never releases idle connections, causing memory to grow unbounded over time.",
    suggestedGoal: "Fix memory leak in worker connection pool",
    status: "open",
    actions: ["Fix", "Dismiss"],
    createdAt: "2025-04-13T09:15:00Z",
    updatedAt: "2025-04-13T09:15:00Z",
  },
  {
    id: "p-2",
    title: "Add retry logic for MCP server connections",
    priority: "warning",
    source: "github_issue",
    context:
      "When an MCP server temporarily goes down, the agent crashes instead of retrying. We need exponential backoff with a configurable max retry count.",
    suggestedGoal: "Implement retry logic for MCP connections",
    status: "open",
    actions: ["Fix", "Dismiss"],
    createdAt: "2025-04-13T08:42:00Z",
    updatedAt: "2025-04-13T08:42:00Z",
  },
  {
    id: "p-3",
    title: "@orchos-team: review the new goal API schema",
    priority: "info",
    source: "mention",
    context:
      'You were mentioned in #goals-api by @alice: "Can someone review the new schema for goal creation?"',
    status: "open",
    actions: ["Dismiss"],
    createdAt: "2025-04-13T07:30:00Z",
    updatedAt: "2025-04-13T07:30:00Z",
  },
  {
    id: "p-4",
    title: "Agent requests approval to delete stale branches",
    priority: "warning",
    source: "agent_request",
    context:
      "CodeAgent detected 12 stale branches older than 30 days. Requesting permission to delete them.",
    suggestedGoal: "Clean up stale Git branches",
    status: "open",
    actions: ["Approve", "Dismiss"],
    createdAt: "2025-04-13T06:55:00Z",
    updatedAt: "2025-04-13T06:55:00Z",
  },
  {
    id: "p-5",
    title: "Pull request #156: Refactor state machine engine",
    priority: "info",
    source: "github_pr",
    context:
      "This PR refactors the state machine engine to support nested states and parallel regions.",
    status: "open",
    actions: ["Fix", "Dismiss"],
    createdAt: "2025-04-13T06:10:00Z",
    updatedAt: "2025-04-13T06:10:00Z",
  },
];

// --- Source Config ---
const sourceConfig: Record<
  InboxSource,
  { icon: typeof GitPullRequestIcon; colorClass: string; bgClass: string; label: string }
> = {
  github_pr: {
    icon: GitPullRequestIcon,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
    label: m.pull_request(),
  },
  github_issue: {
    icon: SquareIcon,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
    label: m.issue(),
  },
  mention: {
    icon: InformationCircleIcon,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
    label: m.mention(),
  },
  agent_request: {
    icon: Robot02Icon,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    label: m.agent_request(),
  },
};

type SourceFilter = "all" | InboxSource;

export function InboxPreviewCard() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const activeItem = mockProblems.find(
    (p) => p.id === activeId && !dismissed.has(p.id) && isInboxItem(p),
  );

  const inboxItems = useMemo(() => {
    return mockProblems.filter((p) => {
      if (dismissed.has(p.id) || p.status !== "open" || !isInboxItem(p)) return false;
      if (sourceFilter !== "all" && p.source !== sourceFilter) return false;
      return true;
    });
  }, [sourceFilter, dismissed]);

  const inboxCounts = useMemo(() => {
    const items = mockProblems.filter(
      (p) => !dismissed.has(p.id) && p.status === "open" && isInboxItem(p),
    );
    return {
      all: items.length,
      github_pr: items.filter((p) => p.source === "github_pr").length,
      github_issue: items.filter((p) => p.source === "github_issue").length,
      mention: items.filter((p) => p.source === "mention").length,
      agent_request: items.filter((p) => p.source === "agent_request").length,
    };
  }, [dismissed]);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    if (activeId === id) setActiveId(null);
  };

  return (
    <div className="w-full h-full flex flex-col rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-border px-4 py-3 bg-background/50">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
            <HugeiconsIcon icon={InboxIcon} className="size-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">{m.inbox()}</span>
          {inboxCounts.all > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              {inboxCounts.all}
            </Badge>
          )}
        </div>

        {/* Source Filter Tabs */}
        <div className="flex items-center gap-1">
          {(["all", "github_pr", "github_issue", "mention", "agent_request"] as SourceFilter[]).map(
            (filter) => {
              const config = filter === "all" ? null : sourceConfig[filter];
              return (
                <button
                  key={filter}
                  onClick={() => setSourceFilter(filter)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                    sourceFilter === filter
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  {config && <HugeiconsIcon icon={config.icon} className="size-2.5" />}
                  <span>{filter === "all" ? m.all() : config?.label || filter}</span>
                  <span className="tabular-nums opacity-50">
                    {inboxCounts[filter as keyof typeof inboxCounts]}
                  </span>
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* Body: List + Detail */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* List */}
        <div className="w-52 shrink-0 border-r border-border md:w-60">
          <ScrollArea className="h-full">
            <div className="p-1.5 space-y-0.5">
              {inboxItems.map((item) => {
                const source = item.source as InboxSource;
                const config = sourceConfig[source];
                const isActive = item.id === activeId;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveId(item.id)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground/80 hover:bg-accent/50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-md",
                        config.bgClass,
                      )}
                    >
                      <HugeiconsIcon
                        icon={config.icon}
                        className={cn("size-3", config.colorClass)}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[11px] font-medium truncate",
                          isActive && "text-accent-foreground",
                        )}
                      >
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">
                          {config.label}
                        </Badge>
                        {item.priority === "critical" && (
                          <Badge variant="destructive" className="text-[8px] px-1 py-0 h-3.5">
                            {m.critical()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {inboxItems.length === 0 && (
                <div className="py-8 text-center">
                  <div className="mx-auto size-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                    <HugeiconsIcon
                      icon={CheckmarkBadge01Icon}
                      className="size-4 text-emerald-500"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{m.inbox_is_empty()}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto">
          {activeItem ? (
            <div className="p-4">
              {/* Detail Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg",
                    sourceConfig[activeItem.source as InboxSource].bgClass,
                  )}
                >
                  <HugeiconsIcon
                    icon={sourceConfig[activeItem.source as InboxSource].icon}
                    className={cn(
                      "size-4",
                      sourceConfig[activeItem.source as InboxSource].colorClass,
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground truncate">{activeItem.title}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge
                      variant="outline"
                      className="text-[8px] uppercase tracking-wider px-1 py-0"
                    >
                      {sourceConfig[activeItem.source as InboxSource].label}
                    </Badge>
                    {activeItem.priority === "critical" && (
                      <Badge
                        variant="destructive"
                        className="text-[8px] uppercase tracking-wider px-1 py-0"
                      >
                        {m.critical()}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {activeItem.createdAt.split("T")[0]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Context */}
              {activeItem.context && (
                <div className="mb-4">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {m.context()}
                  </p>
                  <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                    <p className="text-xs text-foreground whitespace-pre-wrap">
                      {activeItem.context}
                    </p>
                  </div>
                </div>
              )}

              {/* Suggested Goal */}
              {activeItem.suggestedGoal && (
                <div className="mb-4">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {m.suggested()}
                  </p>
                  <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                    <HugeiconsIcon
                      icon={Target01Icon}
                      className="size-3 shrink-0 text-primary/60"
                    />
                    <span className="text-xs font-medium text-primary">
                      {activeItem.suggestedGoal}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
                >
                  <HugeiconsIcon icon={Target01Icon} className="size-3" />
                  {m.convert_to_goal()}
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDismiss(activeItem.id)}
                  className="h-7 text-xs"
                >
                  <HugeiconsIcon icon={ViewOffIcon} className="size-3" />
                  {m.dismiss()}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto size-10 rounded-full bg-muted/30 flex items-center justify-center mb-2">
                  <HugeiconsIcon icon={InboxIcon} className="size-4 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground">{m.no_inbox_selected()}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {m.no_inbox_selected_desc()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
