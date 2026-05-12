import { Calendar01Icon, Calendar03Icon, CalendarCheckIn01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import { calendar_day, calendar_month, calendar_week } from "@/paraglide/messages";

export type CalendarViewMode = "day" | "week" | "month";

interface CalendarViewTabsProps {
  value: CalendarViewMode;
  onChange: (mode: CalendarViewMode) => void;
}

const calendarViewTabs: Array<{
  id: CalendarViewMode;
  label: string;
  icon: typeof Calendar01Icon;
  tone: string;
  bgAccent?: string;
}> = [
  {
    id: "day",
    label: calendar_day(),
    icon: CalendarCheckIn01Icon,
    tone: "text-sky-600 dark:text-sky-400",
    bgAccent: "bg-sky-500/5 dark:bg-sky-500/10",
  },
  {
    id: "week",
    label: calendar_week(),
    icon: Calendar03Icon,
    tone: "text-emerald-600 dark:text-emerald-400",
    bgAccent: "bg-emerald-500/5 dark:bg-emerald-500/10",
  },
  {
    id: "month",
    label: calendar_month(),
    icon: Calendar01Icon,
    tone: "text-violet-600 dark:text-violet-400",
    bgAccent: "bg-violet-500/5 dark:bg-violet-500/10",
  },
];

export function CalendarViewTabs({ value, onChange }: CalendarViewTabsProps) {
  return (
    <div className="flex items-center gap-1.5 px-1">
      {calendarViewTabs.map((tab) => (
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
          <HugeiconsIcon icon={tab.icon} className={cn("size-3.5", value === tab.id ? tab.tone : "")} />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
