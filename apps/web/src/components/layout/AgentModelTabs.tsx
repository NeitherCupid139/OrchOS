import { CloudIcon, CodeIcon, Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import { all, model_cloud, model_local } from "@/paraglide/messages";

export type AgentModelFilter = "all" | "local" | "cloud";

interface AgentModelTabsProps {
  value: AgentModelFilter;
  counts: { all: number; local: number; cloud: number };
  onChange: (filter: AgentModelFilter) => void;
}

const agentModelFilterConfig: Record<AgentModelFilter, { icon: typeof Menu01Icon; label: string; iconClassName: string }> = {
  all: { icon: Menu01Icon, label: all(), iconClassName: "text-muted-foreground/80" },
  local: { icon: CodeIcon, label: model_local(), iconClassName: "text-emerald-500" },
  cloud: { icon: CloudIcon, label: model_cloud(), iconClassName: "text-sky-500" },
};

export function AgentModelTabs({ value, counts, onChange }: AgentModelTabsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {(["all", "local", "cloud"] as AgentModelFilter[]).map((filter) => {
        const config = agentModelFilterConfig[filter];

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
            <span className="hidden sm:inline">{config.label}</span>
            <span className="tabular-nums text-[10px] opacity-60">{counts[filter]}</span>
          </button>
        );
      })}
    </div>
  );
}
