import { CheckmarkCircle02Icon, Calendar03Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import type { PlannerReminder } from "@/lib/api.types";
import { cn } from "@/lib/utils";
import {
  completed,
  delete as delete_message,
  planner_reminders_desc,
  planner_reminders_title,
  planner_reminders_unscheduled,
} from "@/paraglide/messages";

interface PlannerRemindersPanelProps {
  reminders: PlannerReminder[];
  className?: string;
  onToggleComplete?: (reminder: PlannerReminder) => void | Promise<void>;
  onDelete?: (reminder: PlannerReminder) => void | Promise<void>;
  busyReminderId?: string | null;
}

export function PlannerRemindersPanel({
  reminders,
  className,
  onToggleComplete,
  onDelete,
  busyReminderId,
}: PlannerRemindersPanelProps) {
  if (reminders.length === 0) {
    return null;
  }

  const orderedReminders = [...reminders].sort((left, right) => {
    if (left.completed !== right.completed) {
      return left.completed ? 1 : -1;
    }

    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });

  return (
    <section className={cn("rounded-3xl border border-border bg-card shadow-sm", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{planner_reminders_title()}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{planner_reminders_desc()}</p>
        </div>
        <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
          {orderedReminders.length}
        </span>
      </div>

      <div className="grid gap-3 p-3 md:grid-cols-2 2xl:grid-cols-3">
        {orderedReminders.map((reminder) => (
          <div
            key={reminder.id}
            className={cn(
              "rounded-2xl border border-border/60 bg-background/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]",
              reminder.completed && "opacity-60",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={cn("text-sm font-medium text-foreground", reminder.completed && "line-through")}>
                  {reminder.title}
                </div>
                {reminder.notes ? (
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                    {reminder.notes}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={busyReminderId === reminder.id}
                  onClick={() => onToggleComplete?.(reminder)}
                  title={completed()}
                  className={cn(reminder.completed && "text-emerald-600 dark:text-emerald-400")}
                >
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={busyReminderId === reminder.id}
                  onClick={() => onDelete?.(reminder)}
                  title={delete_message()}
                  className="hover:text-destructive"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                </Button>
              </div>
            </div>

            <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <HugeiconsIcon icon={Calendar03Icon} className="size-3.5 shrink-0" />
              <span className="truncate">{reminder.remindAt?.trim() || planner_reminders_unscheduled()}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
