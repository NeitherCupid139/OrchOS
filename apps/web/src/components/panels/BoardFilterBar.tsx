import React from "react";
import { cn } from "@/lib/utils";
import type { BoardTaskFilter } from "./BoardView";
import { HugeiconsIcon } from "@hugeicons/react";
import { board_completed, board_filter_all, board_in_progress, board_planning, board_today } from "@/paraglide/messages";
import {
  Menu01Icon,
  File02Icon,
  PlayCircleIcon,
  InformationCircleIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

interface BoardFilterBarProps {
  boardFilter: BoardTaskFilter;
  onBoardFilterChange: (filter: BoardTaskFilter) => void;
  boardCardsCount?: number;
}

export function BoardFilterBar({
  boardFilter,
  onBoardFilterChange,
  boardCardsCount,
}: BoardFilterBarProps) {
  const conversationBoardColumns = React.useMemo<
    Array<{
      id: BoardTaskFilter;
      label: string;
      icon: typeof File02Icon;
      tone: string;
      bgAccent?: string;
    }>
  >(
    () => [
    {
      id: "all",
      label: board_filter_all(),
      icon: Menu01Icon,
      tone: "",
    },
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
  ], []);

  return (
    <div className="flex items-center gap-1.5 px-1">
      <button
        type="button"
        onClick={() => onBoardFilterChange("all")}
        aria-pressed={boardFilter === "all"}
          className={cn(
            "inline-flex h-7 cursor-pointer items-center gap-2 rounded-full border px-3 text-[11px] font-medium transition-colors",
            boardFilter === "all"
              ? "border-border bg-foreground text-background"
              : "border-border/50 bg-background text-muted-foreground hover:text-foreground",
        )}
      >
        <HugeiconsIcon icon={Menu01Icon} className="size-3.5" />
        {board_filter_all()}
        {boardCardsCount !== undefined && (
          <span className="rounded-full bg-background/15 px-1.5 py-0.5 text-[10px] tabular-nums text-inherit">
            {boardCardsCount}
          </span>
        )}
      </button>

      {conversationBoardColumns.reduce((acc: React.ReactNode[], col) => {
        if (col.id === "all") return acc;
        acc.push(
          <button
            key={col.id}
            type="button"
            onClick={() => onBoardFilterChange(col.id as BoardTaskFilter)}
            aria-pressed={boardFilter === col.id}
             className={cn(
               "inline-flex h-7 cursor-pointer items-center gap-2 rounded-full border px-3 text-[11px] font-medium transition-colors",
               boardFilter === col.id
                 ? cn("border-transparent", col.bgAccent, col.tone)
                 : "border-border/50 bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            <HugeiconsIcon
              icon={col.icon}
              className={cn("size-3.5", boardFilter === col.id ? col.tone : "")}
            />
            {col.label}
          </button>
        );
        return acc;
      }, [])}
    </div>
  );
}
