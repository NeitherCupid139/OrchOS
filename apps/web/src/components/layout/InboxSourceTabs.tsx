import { GitPullRequestIcon, InformationCircleIcon, Menu01Icon, SquareIcon, Wrench01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import { agents, all, issues, mentions, prs } from "@/paraglide/messages";
import type { InboxSource } from "@/lib/types";

export type SourceFilter = "all" | InboxSource;

interface InboxSourceTabsProps {
  value: SourceFilter;
  counts: {
    all: number;
    github_pr: number;
    github_issue: number;
    mention: number;
    agent_request: number;
  };
  onChange: (filter: SourceFilter) => void;
}

const sourceFilterConfig: Record<SourceFilter, { icon: typeof Menu01Icon; label: string; iconClassName: string }> = {
  all: { icon: Menu01Icon, label: all(), iconClassName: "text-muted-foreground/80" },
  github_pr: { icon: GitPullRequestIcon, label: prs(), iconClassName: "text-violet-500" },
  github_issue: { icon: SquareIcon, label: issues(), iconClassName: "text-emerald-500" },
  mention: { icon: InformationCircleIcon, label: mentions(), iconClassName: "text-sky-500" },
  agent_request: { icon: Wrench01Icon, label: agents(), iconClassName: "text-amber-500" },
};

export function InboxSourceTabs({ value, counts, onChange }: InboxSourceTabsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {(["all", "github_pr", "github_issue", "mention", "agent_request"] as SourceFilter[]).map((filter) => {
        const config = sourceFilterConfig[filter];

        return (
          <button
            key={filter}
            type="button"
            onClick={() => onChange(filter)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors sm:gap-1.5 sm:px-2.5",
              value === filter
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <HugeiconsIcon icon={config.icon} className={cn("size-3", config.iconClassName)} />
            <span className="hidden capitalize sm:inline">{config.label || filter}</span>
            <span className="tabular-nums text-[10px] opacity-60">{counts[filter]}</span>
          </button>
        );
      })}
    </div>
  );
}
