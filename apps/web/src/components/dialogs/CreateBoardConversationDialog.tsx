import { useEffect, useRef, useState } from "react";

import { format } from "date-fns";

import { Add01Icon, Cancel01Icon, DragDropVerticalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BoardTaskPriority } from "@/lib/types";
import { m } from "@/paraglide/messages";

interface CreateBoardConversationDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: {
    title: string;
    description: string;
    projectId?: string;
    dueDate?: string;
    priority: BoardTaskPriority;
    tags: string[];
    subtasks: string[];
  }) => Promise<void> | void;
  task?: BoardTaskEditData;
  onUpdate?: (id: string, values: {
    title: string;
    description: string;
    projectId?: string;
    dueDate?: string;
    priority: BoardTaskPriority;
    tags: string[];
    subtasks: string[];
  }) => Promise<void> | void;
}

export interface BoardTaskEditData {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  dueDate?: string;
  priority: BoardTaskPriority;
  tags: string[];
  subtasks: string[];
}

interface TodoRow {
  id: string;
  text: string;
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeEmptyRow(): TodoRow {
  return { id: createId(), text: "" };
}

function subtasksToRows(subtasks: string[]): TodoRow[] {
  if (subtasks.length === 0) return [makeEmptyRow()];
  return subtasks.map((text) => ({ id: createId(), text }));
}

const PRIORITY_OPTIONS: Array<{ value: BoardTaskPriority; label: string }> = [
  { value: "low", label: m.priority_low() },
  { value: "medium", label: m.priority_medium() },
  { value: "high", label: m.priority_high() },
];

export function CreateBoardConversationDialog({
  open,
  onClose,
  onSubmit,
  task,
  onUpdate,
}: CreateBoardConversationDialogProps) {
  const isEditMode = task != null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState<BoardTaskPriority>("medium");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [todoRows, setTodoRows] = useState<TodoRow[]>([makeEmptyRow()]);
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setProjectId(undefined);
      setDueDate(undefined);
      setPriority("medium");
      setTags([]);
      setTagInput("");
      setTodoRows([makeEmptyRow()]);
      setDraggedRowId(null);
      setSubmitting(false);
      return;
    }

    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setProjectId(task.projectId);
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
      setPriority(task.priority);
      setTags(task.tags);
      setTodoRows(subtasksToRows(task.subtasks));
    }

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timeoutId);
  }, [open, task]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle || submitting) {
      return;
    }

    const subtasks = todoRows
      .map((row) => row.text.trim())
      .filter(Boolean);

    const values = {
      title: nextTitle,
      description: description.trim(),
      projectId: projectId || undefined,
      dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
      priority,
      tags,
      subtasks,
    };

    setSubmitting(true);
    try {
      if (isEditMode && onUpdate && task) {
        await onUpdate(task.id, values);
      } else {
        await onSubmit(values);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const addTodoRow = () => {
    setTodoRows((prev) => [...prev, makeEmptyRow()]);
  };

  const removeTodoRow = (id: string) => {
    setTodoRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length === 0 ? [makeEmptyRow()] : next;
    });
  };

  const updateTodoText = (id: string, text: string) => {
    setTodoRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, text } : r)),
    );
  };

  const moveTodoRow = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return;
    }

    setTodoRows((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      if (!removed) {
        return prev;
      }
      next.splice(toIndex, 0, removed);
      return next;
    });
  };

  const moveTodoRowById = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) {
      return;
    }

    const fromIndex = todoRows.findIndex((row) => row.id === sourceId);
    const toIndex = todoRows.findIndex((row) => row.id === targetId);

    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    moveTodoRow(fromIndex, toIndex);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = tagInput.trim();
      if (trimmed && !tags.includes(trimmed)) {
        setTags((prev) => [...prev, trimmed]);
        setTagInput("");
      }
    }
  };

  const handleTodoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTodoRow();
    }
  };

  const subtaskPlaceholders = m.subtasks_placeholder().split("\n");

  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      title={isEditMode ? m.board_edit_task() : m.add_to_board()}
      description={isEditMode ? m.board_edit_task_desc() : m.add_to_board_desc()}
      size="lg"
      className="max-w-2xl"
      bodyClassName="pt-4"
      footerClassName="bg-background/95"
      footer={
        <>
          <Button size="sm" type="button" variant="outline" onClick={onClose}>
            {m.cancel()}
          </Button>
          <Button size="sm" type="submit" form="create-board-conversation-form" disabled={!title.trim() || submitting}>
            {submitting
              ? isEditMode ? m.saving() : m.creating()
              : isEditMode ? m.save() : m.creating_normal()}
          </Button>
        </>
      }
    >
      <form id="create-board-conversation-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
        <section className="rounded-xl bg-muted/[0.18] p-4">
          <div className="space-y-4">
            <fieldset className="space-y-1.5">
              <label htmlFor="create-board-title" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {m.title()}
              </label>
              <Input
                id="create-board-title"
                ref={inputRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={m.follow_up_title()}
                className="h-10 border-border/60 bg-background/80"
              />
            </fieldset>

            <fieldset className="space-y-1.5">
              <label htmlFor="create-board-priority" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {m.priority()}
              </label>
              <Select
                value={priority}
                onValueChange={(value) => {
                  setPriority(value as BoardTaskPriority);
                }}
              >
                <SelectTrigger id="create-board-priority" className="h-10 w-full border-border/60 bg-background/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </fieldset>

            <fieldset className="space-y-1.5">
              <label htmlFor="create-board-due-date" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {m.due_date()}
              </label>
              <DatePicker
                id="create-board-due-date"
                value={dueDate}
                onChange={setDueDate}
                className="h-10 border-border/60 bg-background/80"
              />
            </fieldset>
          </div>
        </section>

        <section className="rounded-xl bg-muted/[0.18] p-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-foreground">{m.tags_label()}</p>
          </div>
          <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-border/60 bg-background/80 px-2 py-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  className="inline-flex size-3.5 items-center justify-center rounded-full hover:bg-primary/20 transition-colors"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-2.5" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder={tags.length === 0 ? m.tags_placeholder() : ""}
              className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </section>

        <section className="rounded-xl bg-muted/[0.18] p-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-foreground">{m.subtasks_label()}</p>
            <p className="mt-1 text-xs text-muted-foreground">{m.tags_subtasks_hint()}</p>
          </div>

          <div className="space-y-1.5">
            {todoRows.map((row, rowIdx) => (
              <div
                key={row.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (draggedRowId) {
                    event.dataTransfer.dropEffect = "move";
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!draggedRowId) {
                    return;
                  }

                  moveTodoRowById(draggedRowId, row.id);
                  setDraggedRowId(null);
                }}
                className="flex items-center gap-1.5"
              >
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    setDraggedRowId(row.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", row.id);
                  }}
                  onDragEnd={() => setDraggedRowId(null)}
                  className="inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing"
                  aria-label={m.drag_to_reorder()}
                >
                  <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
                </button>
                <Input
                  value={row.text}
                  onChange={(event) => updateTodoText(row.id, event.target.value)}
                  onKeyDown={handleTodoKeyDown}
                  placeholder={subtaskPlaceholders[rowIdx % subtaskPlaceholders.length] ?? subtaskPlaceholders[0]}
                  className="h-9 flex-1 border-border/60 bg-background/80 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeTodoRow(row.id)}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={m.remove_item()}
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addTodoRow}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
              {m.add()}
            </button>
          </div>
        </section>
      </form>
    </AppDialog>
  );
}
