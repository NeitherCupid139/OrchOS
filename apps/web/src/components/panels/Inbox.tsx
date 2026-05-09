import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  GitPullRequestIcon,
  SquareIcon,
  InformationCircleIcon,
  Robot02Icon,
  Target01Icon,
  CheckmarkBadge01Icon,
  MoreHorizontal,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { m } from "@/paraglide/messages";
import type { Problem, InboxSource, ProblemStatus } from "@/lib/types";
import { isInboxItem } from "@/lib/types";
import type { InboxStatusFilter } from "@/components/layout/InboxStatusTabs";

type SourceFilter = "all" | InboxSource;

interface InboxProps {
  problems: Problem[];
  onConvertToGoal: (problemId: string, suggestedGoal?: string) => void;
  onDismiss: (problemId: string) => void;
  sourceFilter: SourceFilter;
  statusFilter: InboxStatusFilter;
}

const sourceConfig: Record<
  InboxSource,
  { icon: IconSvgElement; label: string; colorClass: string; bgClass: string; borderClass: string }
> = {
  github_pr: {
    icon: GitPullRequestIcon,
    label: m.pull_request(),
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/5",
    borderClass: "border-purple-500/20",
  },
  github_issue: {
    icon: SquareIcon,
    label: m.issue(),
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/5",
    borderClass: "border-green-500/20",
  },
  mention: {
    icon: InformationCircleIcon,
    label: m.mention(),
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/5",
    borderClass: "border-blue-500/10",
  },
  agent_request: {
    icon: Robot02Icon,
    label: m.agent_request(),
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/5",
    borderClass: "border-amber-500/20",
  },
};

export function Inbox({
  problems,
  onConvertToGoal,
  onDismiss,
  sourceFilter,
  statusFilter,
}: InboxProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const inboxItems = useMemo(() => {
    let filtered = problems.filter((p) => isInboxItem(p));
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === (statusFilter as ProblemStatus));
    }
    if (sourceFilter !== "all") {
      filtered = filtered.filter((p) => p.source === sourceFilter);
    }
    return filtered;
  }, [problems, sourceFilter, statusFilter]);

  const handleConvert = useCallback(
    (problemId: string, suggestedGoal?: string) => {
      setConvertingId(problemId);
      onConvertToGoal(problemId, suggestedGoal);
    },
    [onConvertToGoal],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, inboxItems.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && focusedIndex >= 0 && focusedIndex < inboxItems.length) {
        e.preventDefault();
        const item = inboxItems[focusedIndex];
        handleConvert(item.id, item.suggestedGoal);
      } else if (e.key === "d" && focusedIndex >= 0 && focusedIndex < inboxItems.length) {
        e.preventDefault();
        onDismiss(inboxItems[focusedIndex].id);
      }
    },
    [focusedIndex, inboxItems, handleConvert, onDismiss],
  );

  const handleKeyDownRef = useRef(handleKeyDown);
  handleKeyDownRef.current = handleKeyDown;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleKeyDownRef.current(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {inboxItems.length > 0 && (
        <div className="flex items-center gap-2 border-b border-border/50 px-4 py-1.5">
          <span className="text-xs text-muted-foreground">
            {inboxItems.length} item{inboxItems.length !== 1 ? "s" : ""} awaiting triage
          </span>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/50">
          {inboxItems.map((item, idx) => {
            const source = item.source as InboxSource;
            const config = sourceConfig[source];
            const SourceIcon = config.icon;
            const isFocused = idx === focusedIndex;
            const isConverting = convertingId === item.id;

            return (
              <div
                key={item.id}
                className={cn(
                  "transition-colors hover:bg-accent/30",
                  isFocused && "ring-1 ring-in-ring ring-primary/30",
                )}
              >
                <div className={cn("group flex gap-3 px-4 py-3", config.bgClass)}>
                  {/* Source Icon */}
                  <HugeiconsIcon
                    icon={SourceIcon}
                    className={cn("mt-0.5 size-4 shrink-0", config.colorClass)}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{item.title}</span>
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase tracking-wider px-1.5 py-0"
                      >
                        {config.label}
                      </Badge>
                      {item.priority === "critical" && (
                        <Badge
                          variant="destructive"
                          className="text-[9px] uppercase tracking-wider px-1.5 py-0"
                        >
                          {m.critical()}
                        </Badge>
                      )}
                    </div>

                    {/* Context */}
                    {item.context && (
                      <p className="mt-1 text-xs text-muted-foreground truncate">{item.context}</p>
                    )}

                    {/* Suggested Goal */}
                    {item.suggestedGoal && (
                      <div className="mt-2 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5">
                        <HugeiconsIcon
                          icon={Target01Icon}
                          className="size-3.5 shrink-0 text-primary/60"
                        />
                        <span className="text-xs text-primary/80">
                          {m.suggested()}
                          <span className="font-medium text-primary">{item.suggestedGoal}</span>
                        </span>
                      </div>
                    )}

                    {/* Primary Action: Convert to Goal */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        onClick={() => handleConvert(item.id, item.suggestedGoal)}
                        disabled={isConverting}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                          isConverting
                            ? "bg-muted text-muted-foreground cursor-wait"
                            : "bg-primary text-primary-foreground hover:bg-primary/90",
                        )}
                      >
                        <HugeiconsIcon icon={Target01Icon} className="size-3.5" />
                        {isConverting ? m.converting() : m.convert_to_goal()}
                      </button>

                      {/* Dismiss */}
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground">
                          <HugeiconsIcon icon={MoreHorizontal} className="size-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-36">
                          <DropdownMenuItem onClick={() => onDismiss(item.id)}>
                            <HugeiconsIcon icon={ViewOffIcon} className="size-3.5" />
                            {m.dismiss()}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="shrink-0 text-[10px] text-muted-foreground tabular-nums self-start mt-0.5">
                    {item.createdAt.split("T")[1]?.slice(0, 5) || ""}
                  </div>
                </div>
              </div>
            );
          })}

          {inboxItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <HugeiconsIcon icon={CheckmarkBadge01Icon} className="size-5 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-foreground">{m.inbox_is_empty()}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.no_new_items()}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  );
}
