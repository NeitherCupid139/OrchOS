import {
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Menu01Icon,
  PlayCircleIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import { all, board_completed, ignored, in_progress, open } from "@/paraglide/messages";

export type InboxStatusFilter = "all" | "open" | "assigned" | "fixed" | "ignored";

interface InboxStatusTabsProps {
  value: InboxStatusFilter;
  onChange: (filter: InboxStatusFilter) => void;
}

const inboxStatusTabs: Array<{
  id: InboxStatusFilter;
  label: string;
  icon: typeof Menu01Icon;
  tone: string;
  bgAccent?: string;
}> = [
  {
    id: "all",
    label: all(),
    icon: Menu01Icon,
    tone: "",
  },
  {
    id: "open",
    label: open(),
    icon: InformationCircleIcon,
    tone: "text-sky-600 dark:text-sky-400",
    bgAccent: "bg-sky-500/5 dark:bg-sky-500/10",
  },
  {
    id: "assigned",
    label: in_progress(),
    icon: PlayCircleIcon,
    tone: "text-amber-600 dark:text-amber-400",
    bgAccent: "bg-amber-500/5 dark:bg-amber-500/10",
  },
  {
    id: "fixed",
    label: board_completed(),
    icon: CheckmarkCircle02Icon,
    tone: "text-emerald-600 dark:text-emerald-400",
    bgAccent: "bg-emerald-500/5 dark:bg-emerald-500/10",
  },
  {
    id: "ignored",
    label: ignored(),
    icon: ViewOffIcon,
    tone: "text-muted-foreground",
    bgAccent: "bg-muted",
  },
];

export function InboxStatusTabs({ value, onChange }: InboxStatusTabsProps) {
  return (
    <div className="flex items-center gap-1.5 px-1">
      {inboxStatusTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-pressed={value === tab.id}
          className={cn(
            "inline-flex h-7 cursor-pointer items-center gap-2 rounded-full border px-3 text-[11px] font-medium transition-colors",
            value === tab.id
              ? tab.id === "all"
                ? "border-border bg-foreground text-background"
                : cn("border-transparent", tab.bgAccent, tab.tone)
              : "border-border/50 bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          <HugeiconsIcon
            icon={tab.icon}
            className={cn("size-3.5", value === tab.id ? tab.tone : "")}
          />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
