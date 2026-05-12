import {
  Archive01Icon,
  CheckmarkCircle02Icon,
  Mail01Icon,
  Menu01Icon,
  ReplayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import { all, archived, board_completed, unread, waiting_reply } from "@/paraglide/messages";

export type MailFolderFilter =
  | "all"
  | "unread"
  | "waiting_reply"
  | "completed"
  | "archived";

interface MailFolderTabsProps {
  value: MailFolderFilter;
  onChange: (mode: MailFolderFilter) => void;
}

const mailFolderTabs: Array<{
  id: MailFolderFilter;
  label: () => string;
  icon: typeof Menu01Icon;
  tone: string;
  bgAccent?: string;
}> = [
  { id: "all", label: () => all(), icon: Menu01Icon, tone: "" },
  { id: "unread", label: () => unread(), icon: Mail01Icon, tone: "text-sky-600 dark:text-sky-400", bgAccent: "bg-sky-500/5 dark:bg-sky-500/10" },
  { id: "waiting_reply", label: () => waiting_reply(), icon: ReplayIcon, tone: "text-amber-600 dark:text-amber-400", bgAccent: "bg-amber-500/5 dark:bg-amber-500/10" },
  { id: "completed", label: () => board_completed(), icon: CheckmarkCircle02Icon, tone: "text-emerald-600 dark:text-emerald-400", bgAccent: "bg-emerald-500/5 dark:bg-emerald-500/10" },
  { id: "archived", label: () => archived(), icon: Archive01Icon, tone: "text-muted-foreground", bgAccent: "bg-muted" },
];

export function MailFolderTabs({ value, onChange }: MailFolderTabsProps) {
  return (
    <div className="flex items-center gap-1.5 px-1">
      {mailFolderTabs.map((tab) => (
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
            {tab.label()}
        </button>
      ))}
    </div>
  );
}
