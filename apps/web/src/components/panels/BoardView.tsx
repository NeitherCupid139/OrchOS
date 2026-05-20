import React, { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  Edit02Icon,
  File02Icon,
  InformationCircleIcon,
  PlayCircleIcon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { InfoCard, InfoCardContent, InfoCardDescription } from "@/components/ui/info-card";
import { CreateBoardConversationDialog, type BoardTaskEditData } from "@/components/dialogs/CreateBoardConversationDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDashboard } from "@/lib/dashboard-context";
import type { PlannerReminder } from "@/lib/api.types";
import { getReminderDisplayText } from "@/lib/planner-reminders";
import { useBoardStore } from "@/lib/stores/board";
import { cn } from "@/lib/utils";
import { board_completed, board_delete_conversation, board_edit_task, board_in_progress, board_no_tasks, board_planning, board_today } from "@/paraglide/messages";
import type { BoardTaskColumnId, BoardTaskFilter, BoardTaskPriority } from "@/lib/types";

export type { BoardTaskColumnId, BoardTaskFilter };

interface BoardViewProps {
  boardFilter: BoardTaskFilter;
  reminders?: PlannerReminder[];
  busyReminderId?: string | null;
  onToggleReminderComplete?: (reminder: PlannerReminder) => void | Promise<void>;
  onDeleteReminder?: (reminder: PlannerReminder) => void | Promise<void>;
}

function parseBoardDate(value?: string) {
  if (!value) return null;

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 12);
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;

  return new Date(timestamp);
}

function SubtaskList({ subtasks }: { subtasks: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? subtasks : subtasks.slice(0, 3);
  const hiddenCount = subtasks.length - 3;

  return (
    <div className="space-y-0.5">
      {visible.map((task, i) => (
        <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground/60">
          <div className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/30" />
          <span className="line-clamp-1">{task}</span>
        </div>
      ))}
      {!expanded && hiddenCount > 0 ? (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(true); }}
          className="pl-3.5 text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
        >
          +{hiddenCount} more
        </button>
      ) : null}
      {expanded && hiddenCount > 0 ? (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(false); }}
          className="pl-3.5 text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
        >
          show less
        </button>
      ) : null}
    </div>
  );
}

function priorityTone(priority: BoardTaskPriority) {
  if (priority === "low") return "text-emerald-600 dark:text-emerald-400";
  if (priority === "medium") return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function BoardView({
  boardFilter,
  reminders = [],
  busyReminderId,
  onToggleReminderComplete,
  onDeleteReminder,
}: BoardViewProps) {
  const [editingTask, setEditingTask] = useState<BoardTaskEditData | null>(null);
  const { projects, settings } = useDashboard();
  const tasks = useBoardStore((state) => state.tasks);
  const updateTask = useBoardStore((state) => state.updateTask);
  const deleteTask = useBoardStore((state) => state.deleteTask);
  const locale = settings?.locale;
  const timezone = settings?.timezone;

  const boardDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: timezone,
      }),
    [locale, timezone],
  );

  const formatBoardDate = useMemo(
    () => (value?: string) => {
      const date = parseBoardDate(value);
      return date ? boardDateFormatter.format(date) : "";
    },
    [boardDateFormatter],
  );

  const boardColumns: Array<{
    id: BoardTaskColumnId;
    label: string;
    icon: typeof PlayCircleIcon;
    tone: string;
    bgAccent: string;
  }> = [
    {
      id: "review",
      label: board_today(),
      icon: InformationCircleIcon,
      tone: "text-violet-600 dark:text-violet-400",
      bgAccent: "bg-violet-500/5 dark:bg-violet-500/10",
    },
    {
      id: "planning",
      label: board_planning(),
      icon: File02Icon,
      tone: "text-amber-600 dark:text-amber-400",
      bgAccent: "bg-amber-500/5 dark:bg-amber-500/10",
    },
    {
      id: "in_progress",
      label: board_in_progress(),
      icon: PlayCircleIcon,
      tone: "text-sky-600 dark:text-sky-400",
      bgAccent: "bg-sky-500/5 dark:bg-sky-500/10",
    },
    {
      id: "completed",
      label: board_completed(),
      icon: CheckmarkCircle02Icon,
      tone: "text-emerald-600 dark:text-emerald-400",
      bgAccent: "bg-emerald-500/5 dark:bg-emerald-500/10",
    },
  ];

  const boardCards = useMemo(
    () => [...tasks].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [tasks],
  );
  const reminderCards = useMemo(
    () => reminders.map((reminder) => ({
      id: `reminder-${reminder.id}`,
      reminder,
      column: reminder.completed ? "completed" : "review" as BoardTaskColumnId,
    })),
    [reminders],
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background px-4 py-4 md:px-6">
      <div className="mx-auto flex min-h-0 w-full max-w-full flex-1 flex-col gap-3 px-0 pb-2 md:px-6">
        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:items-stretch lg:overflow-x-auto">
          {boardColumns.reduce((acc: React.ReactNode[], column) => {
            if (boardFilter !== "all" && column.id !== boardFilter) return acc;
            const columnCards = boardCards.filter((card) => card.column === column.id);
            const columnReminders = reminderCards.filter((card) => card.column === column.id);
            const columnItems = [...columnReminders, ...columnCards];

            acc.push(
              <div
                key={column.id}
                className={cn(
                  "flex min-h-[14rem] min-w-0 flex-col rounded-xl border border-border/30 bg-muted/10 lg:min-h-0 lg:flex-1 lg:basis-0",
                  column.bgAccent,
                )}
              >
                <div className="flex items-center gap-2.5 border-b border-border/20 px-4 py-3">
                  <HugeiconsIcon icon={column.icon} className={cn("size-3.5", column.tone, "opacity-70")} />
                  <span className="text-xs font-semibold tracking-wide text-foreground/50">{column.label}</span>
                  <span
                    className={cn(
                      "ml-auto inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums",
                      columnCards.length > 0 ? cn(column.tone, "bg-foreground/5") : "bg-foreground/3 text-muted-foreground/50",
                    )}
                  >
                    {columnCards.length}
                  </span>
                </div>

                <div
                  className={cn(
                    "min-h-0 flex-1 p-3",
                    columnItems.length === 0
                      ? "flex items-center justify-center"
                      : cn(
                          "grid content-start auto-rows-max gap-3 overflow-y-auto",
                          boardFilter === "all" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-2",
                        ),
                  )}
                >
                  {columnReminders.map(({ reminder }) => {
                      const reminderDisplayText = getReminderDisplayText(reminder, {
                        locale,
                        timezone,
                      });

                      return (
                      <div
                        key={reminder.id}
                        className="group/card rounded-xl text-left transition-transform duration-200 hover:-translate-y-0.5"
                      >
                        <InfoCard
                          showDismissButton={false}
                          className="border-border/40 bg-background/80 p-4 text-left transition-all duration-200 group-hover/card:border-border/80 group-hover/card:bg-background"
                        >
                          <InfoCardContent className="gap-3">
                            <div className="relative min-w-0 flex-1">
                              <div className="pointer-events-none absolute top-1/2 right-0 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover/card:pointer-events-auto group-hover/card:opacity-100">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={busyReminderId === reminder.id}
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                  }}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    void onToggleReminderComplete?.(reminder);
                                  }}
                                  className={cn(
                                    "text-muted-foreground/60 hover:text-foreground",
                                    reminder.completed && "text-emerald-600 dark:text-emerald-400",
                                  )}
                                >
                                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={busyReminderId === reminder.id}
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                  }}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    void onDeleteReminder?.(reminder);
                                  }}
                                  className="text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className={cn("line-clamp-1 text-sm font-medium text-foreground/90", reminder.completed && "line-through")}>
                                {reminder.title}
                              </div>
                              <InfoCardDescription className="line-clamp-3 text-xs leading-relaxed text-muted-foreground/60">
                                {reminder.notes?.trim() || reminderDisplayText || board_no_tasks()}
                              </InfoCardDescription>
                            </div>

                            <div className="flex items-center justify-between gap-2 border-t border-border/15 pt-2">
                              <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground/45">
                                <span className="inline-flex items-center rounded-md bg-muted/50 px-2 py-0.5 text-[11px] text-violet-600 dark:text-violet-400">
                                  reminder
                                </span>
                              </div>
                              {reminderDisplayText ? (
                                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground/45">
                                  <HugeiconsIcon icon={Calendar03Icon} className="size-3" />
                                  {reminderDisplayText}
                                </span>
                              ) : null}
                            </div>
                          </InfoCardContent>
                        </InfoCard>
                      </div>
                      );
                    })}

                  {columnCards.map((card) => {
                      const linkedProject = projects?.find((project) => project.id === card.projectId);

                      return (
                        <div
                          key={card.id}
                          className="group/card rounded-xl text-left transition-transform duration-200 hover:-translate-y-0.5"
                        >
                          <InfoCard
                            showDismissButton={false}
                            className="border-border/40 bg-background/80 p-4 text-left transition-all duration-200 group-hover/card:border-border/80 group-hover/card:bg-background"
                          >
                            <InfoCardContent className="gap-3">
                              <div className="relative min-w-0 flex-1">
                                <div className="pointer-events-none absolute top-1/2 right-0 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover/card:pointer-events-auto group-hover/card:opacity-100">
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={(props) => (
                                        <Button
                                          {...props}
                                          type="button"
                                          variant="ghost"
                                          size="icon-xs"
                                          onMouseDown={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                          }}
                                          onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            setEditingTask({
                                              id: card.id,
                                              title: card.title,
                                              description: card.description,
                                              projectId: card.projectId,
                                              dueDate: card.dueDate,
                                              priority: card.priority,
                                              tags: card.tags,
                                              subtasks: card.subtasks,
                                            });
                                          }}
                                          className="text-muted-foreground/60 hover:text-foreground"
                                        >
                                          <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                                        </Button>
                                      )}
                                    />
                                    <TooltipContent side="top">{board_edit_task()}</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={(props) => (
                                        <Button
                                          {...props}
                                          type="button"
                                          variant="ghost"
                                          size="icon-xs"
                                          onMouseDown={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                          }}
                                          onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            deleteTask(card.id);
                                          }}
                                          className="text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                                        >
                                          <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                                        </Button>
                                      )}
                                    />
                                    <TooltipContent side="top">{board_delete_conversation()}</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="line-clamp-1 text-sm font-medium text-foreground/90">{card.title}</div>
                                <InfoCardDescription className="line-clamp-3 text-xs leading-relaxed text-muted-foreground/60">
                                  {card.description?.trim() || board_no_tasks()}
                                </InfoCardDescription>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {linkedProject ? (
                                  <span className="inline-flex items-center rounded-md bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground/80">
                                    {linkedProject.name}
                                  </span>
                                ) : null}
                                {card.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground/75"
                                  >
                                    <HugeiconsIcon icon={Tag01Icon} className="size-3" />
                                    {tag}
                                  </span>
                                ))}
                              </div>

                              {card.subtasks.length > 0 ? (
                                <SubtaskList subtasks={card.subtasks} />
                              ) : null}

                              <div className="flex items-center justify-between gap-2 border-t border-border/15 pt-2">
                                <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground/45">
                                  <span className={cn("inline-flex items-center rounded-md bg-muted/50 px-2 py-0.5 text-[11px]", priorityTone(card.priority))}>
                                    {card.priority}
                                  </span>
                                </div>
                                {card.dueDate ? (
                                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground/45">
                                    <HugeiconsIcon icon={Calendar03Icon} className="size-3" />
                                    {formatBoardDate(card.dueDate)}
                                  </span>
                                ) : null}
                              </div>
                            </InfoCardContent>
                          </InfoCard>
                        </div>
                      );
                    })}

                    {columnItems.length === 0 ? (
                      <div className="flex w-full flex-col items-center justify-center rounded-xl px-3 py-10 text-center">
                        <HugeiconsIcon icon={column.icon} className="mb-2 size-5 text-muted-foreground/15" />
                        <span className="text-xs text-muted-foreground/30">{board_no_tasks()}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
            );
            return acc;
          }, [])}
        </div>
      </div>

      <CreateBoardConversationDialog
        open={editingTask !== null}
        task={editingTask ?? undefined}
        onClose={() => setEditingTask(null)}
        onSubmit={async () => {}}
        onUpdate={(id, values) => {
          updateTask(id, values);
          setEditingTask(null);
        }}
      />
    </div>
  );
}
