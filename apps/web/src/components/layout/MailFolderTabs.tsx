import {
  Archive01Icon,
  Delete02Icon,
  InboxIcon,
  MailEdit01Icon,
  MailSend01Icon,
  SpamIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import { archived, drafts, inbox, sent, spam, trash } from "@/paraglide/messages";

export type MailFolderFilter =
  | "inbox"
  | "drafts"
  | "sent"
  | "spam"
  | "trash"
  | "archived";

interface MailFolderTabsProps {
  value: MailFolderFilter;
  onChange: (mode: MailFolderFilter) => void;
}

const mailFolderTabs: Array<{
  id: MailFolderFilter;
  label: () => string;
  icon: typeof InboxIcon;
  tone: string;
  bgAccent?: string;
}> = [
  { id: "inbox", label: () => inbox(), icon: InboxIcon, tone: "text-sky-600 dark:text-sky-400", bgAccent: "bg-sky-500/5 dark:bg-sky-500/10" },
  { id: "drafts", label: () => drafts(), icon: MailEdit01Icon, tone: "text-violet-600 dark:text-violet-400", bgAccent: "bg-violet-500/5 dark:bg-violet-500/10" },
  { id: "sent", label: () => sent(), icon: MailSend01Icon, tone: "text-emerald-600 dark:text-emerald-400", bgAccent: "bg-emerald-500/5 dark:bg-emerald-500/10" },
  { id: "spam", label: () => spam(), icon: SpamIcon, tone: "text-orange-600 dark:text-orange-400", bgAccent: "bg-orange-500/5 dark:bg-orange-500/10" },
  { id: "trash", label: () => trash(), icon: Delete02Icon, tone: "text-red-600 dark:text-red-400", bgAccent: "bg-red-500/5 dark:bg-red-500/10" },
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
              ? cn("border-transparent", tab.bgAccent, tab.tone)
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
