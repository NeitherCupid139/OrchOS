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
import { RenameDialog } from "@/components/dialogs/RenameDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDashboard } from "@/lib/dashboard-context";
import { useBoardStore } from "@/lib/stores/board";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { BoardTaskColumnId, BoardTaskFilter, BoardTaskPriority } from "@/lib/types";

export type { BoardTaskColumnId, BoardTaskFilter };

interface BoardViewProps {
  boardFilter: BoardTaskFilter;
}

const boardTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatBoardTime(value?: string) {
  if (!value) return "";

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "";

  return boardTimeFormatter.format(new Date(timestamp));
}

function priorityTone(priority: BoardTaskPriority) {
  if (priority === "low") return "text-emerald-600 dark:text-emerald-400";
  if (priority === "medium") return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function BoardView({ boardFilter }: BoardViewProps) {
  const [renameCardId, setRenameCardId] = useState<string | null>(null);
  const [renameCardTitle, setRenameCardTitle] = useState("");
  const { projects } = useDashboard();
  const tasks = useBoardStore((state) => state.tasks);
  const updateTask = useBoardStore((state) => state.updateTask);
  const deleteTask = useBoardStore((state) => state.deleteTask);

  const boardColumns: Array<{
    id: BoardTaskColumnId;
    label: string;
    icon: typeof PlayCircleIcon;
    tone: string;
    bgAccent: string;
  }> = [
    {
      id: "review",
      label: m.board_today(),
      icon: InformationCircleIcon,
      tone: "text-violet-600 dark:text-violet-400",
      bgAccent: "bg-violet-500/5 dark:bg-violet-500/10",
    },
    {
      id: "planning",
      label: m.board_planning(),
      icon: File02Icon,
      tone: "text-amber-600 dark:text-amber-400",
      bgAccent: "bg-amber-500/5 dark:bg-amber-500/10",
    },
    {
      id: "in_progress",
      label: m.board_in_progress(),
      icon: PlayCircleIcon,
      tone: "text-sky-600 dark:text-sky-400",
      bgAccent: "bg-sky-500/5 dark:bg-sky-500/10",
    },
    {
      id: "completed",
      label: m.board_completed(),
      icon: CheckmarkCircle02Icon,
      tone: "text-emerald-600 dark:text-emerald-400",
      bgAccent: "bg-emerald-500/5 dark:bg-emerald-500/10",
    },
  ];

  const boardCards = useMemo(
    () => [...tasks].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [tasks],
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background px-4 py-4 md:px-6">
      <div className="mx-auto flex min-h-0 w-full max-w-full flex-1 flex-col gap-3 px-0 pb-2 md:px-6">
        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:items-stretch lg:overflow-x-auto">
          {boardColumns.reduce((acc: React.ReactNode[], column) => {
            if (boardFilter !== "all" && column.id !== boardFilter) return acc;
            const columnCards = boardCards.filter((card) => card.column === column.id);

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
                    columnCards.length === 0
                      ? "flex items-center justify-center"
                      : cn(
                          "grid content-start auto-rows-max gap-3 overflow-y-auto",
                          boardFilter === "all" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5",
                        ),
                  )}
                >
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
                                            setRenameCardId(card.id);
                                            setRenameCardTitle(card.title);
                                          }}
                                          className="text-muted-foreground/60 hover:text-foreground"
                                        >
                                          <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                                        </Button>
                                      )}
                                    />
                                    <TooltipContent side="top">{m.board_rename_conversation()}</TooltipContent>
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
                                    <TooltipContent side="top">{m.board_delete_conversation()}</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="line-clamp-1 text-sm font-medium text-foreground/90">{card.title}</div>
                                <InfoCardDescription className="line-clamp-3 text-xs leading-relaxed text-muted-foreground/60">
                                  {card.description?.trim() || m.board_no_tasks()}
                                </InfoCardDescription>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {linkedProject ? (
                                  <span className="inline-flex items-center rounded-md bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground/80">
                                    {linkedProject.name}
                                  </span>
                                ) : null}
                                <span className={cn("inline-flex items-center rounded-md bg-muted/50 px-2 py-0.5 text-[11px]", priorityTone(card.priority))}>
                                  {card.priority}
                                </span>
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

                              <div className="flex items-center justify-between gap-2 border-t border-border/15 pt-2">
                                <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground/45">
                                  {card.dueDate ? (
                                    <span className="inline-flex items-center gap-1">
                                      <HugeiconsIcon icon={Calendar03Icon} className="size-3" />
                                      {card.dueDate}
                                    </span>
                                  ) : null}
                                  {card.subtasks.length > 0 ? (
                                    <span>{card.subtasks.length} subtasks</span>
                                  ) : null}
                                </div>
                                <span className="text-[11px] tabular-nums text-muted-foreground/45">
                                  {formatBoardTime(card.updatedAt)}
                                </span>
                              </div>
                            </InfoCardContent>
                          </InfoCard>
                        </div>
                      );
                    })}

                    {columnCards.length === 0 ? (
                      <div className="flex w-full flex-col items-center justify-center rounded-xl px-3 py-10 text-center">
                        <HugeiconsIcon icon={column.icon} className="mb-2 size-5 text-muted-foreground/15" />
                        <span className="text-xs text-muted-foreground/30">{m.board_no_tasks()}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
            );
            return acc;
          }, [])}
        </div>
      </div>

      <RenameDialog
        open={renameCardId !== null}
        title={m.board_rename_conversation()}
        initialValue={renameCardTitle}
        placeholder={m.untitled_conversation()}
        onClose={() => {
          setRenameCardId(null);
          setRenameCardTitle("");
        }}
        onSubmit={(name) => {
          if (renameCardId && name !== renameCardTitle) {
            updateTask(renameCardId, { title: name });
          }
          setRenameCardId(null);
          setRenameCardTitle("");
        }}
      />
    </div>
  );
}
