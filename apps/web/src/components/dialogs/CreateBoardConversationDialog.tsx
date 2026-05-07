import { useEffect, useRef, useState } from "react";

import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Project } from "@/lib/types";
import { m } from "@/paraglide/messages";

interface CreateBoardConversationDialogProps {
  open: boolean;
  projects: Project[];
  onClose: () => void;
  onSubmit: (values: {
    title: string;
    description: string;
    projectId?: string;
    dueDate?: string;
    priority: "low" | "medium" | "high";
    tags: string[];
    subtasks: string[];
  }) => Promise<void> | void;
}

export function CreateBoardConversationDialog({
  open,
  projects,
  onClose,
  onSubmit,
}: CreateBoardConversationDialogProps) {
  const availableProjects = projects ?? [];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [tags, setTags] = useState("");
  const [subtasks, setSubtasks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setProjectId("");
      setDueDate("");
      setPriority("medium");
      setTags("");
      setSubtasks("");
      setSubmitting(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timeoutId);
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle || submitting) {
      return;
    }

    const parsedTags = tags
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const parsedSubtasks = subtasks
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      await onSubmit({
        title: nextTitle,
        description: description.trim(),
        projectId: projectId || undefined,
        dueDate: dueDate || undefined,
        priority,
        tags: parsedTags,
        subtasks: parsedSubtasks,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      title={m.add_to_board()}
      description={m.add_to_board_desc()}
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
            {submitting ? m.creating() : m.creating_normal()}
          </Button>
        </>
      }
      >
      <form id="create-board-conversation-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
        <section className="rounded-xl border border-border/50 bg-muted/[0.18] p-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-foreground">{m.title()}</p>
            <p className="mt-1 text-xs text-muted-foreground">{m.title_concrete_hint()}</p>
          </div>

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
              <label htmlFor="create-board-description" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {m.notes_label()}
              </label>
              <Textarea
                id="create-board-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={m.notes_placeholder()}
                className="min-h-28 resize-y border-border/60 bg-background/80"
              />
            </fieldset>
          </div>
        </section>

        <section className="rounded-xl border border-border/50 bg-background p-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-foreground">{m.details()}</p>
            <p className="mt-1 text-xs text-muted-foreground">{m.tags_subtasks_hint()}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset className="space-y-1.5">
              <label htmlFor="create-board-project" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {m.project()}
              </label>
              <Select
                value={projectId}
                onValueChange={(value) => setProjectId(value ?? "")}
              >
                <SelectTrigger id="create-board-project" className="h-10 w-full border-border/60 bg-background/80">
                  <SelectValue>
                    {availableProjects.find((project) => project.id === projectId)?.name ?? m.no_linked_project()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{m.no_linked_project()}</SelectItem>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </fieldset>

            <fieldset className="space-y-1.5">
              <label htmlFor="create-board-due-date" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {m.due_date()}
              </label>
              <Input
                id="create-board-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="h-10 border-border/60 bg-background/80"
              />
            </fieldset>

            <fieldset className="space-y-1.5">
              <label htmlFor="create-board-priority" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Priority
              </label>
              <Select
                value={priority}
                onValueChange={(value) => {
                  if (value === "low" || value === "medium" || value === "high") {
                    setPriority(value);
                  }
                }}
              >
                <SelectTrigger id="create-board-priority" className="h-10 w-full border-border/60 bg-background/80">
                  <SelectValue>
                    {priority === "low" ? "Low" : priority === "medium" ? "Medium" : "High"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </fieldset>
          </div>
        </section>

        <section className="rounded-xl border border-border/50 bg-background p-4">
          <div className="grid gap-5 lg:grid-cols-2">
            <fieldset className="space-y-1.5">
              <label htmlFor="create-board-tags" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {m.tags_label()}
              </label>
              <Textarea
                id="create-board-tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder={m.tags_placeholder()}
                className="min-h-28 resize-y border-border/60 bg-background/80"
              />
            </fieldset>

            <fieldset className="space-y-1.5">
              <label htmlFor="create-board-subtasks" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {m.subtasks_label()}
              </label>
              <Textarea
                id="create-board-subtasks"
                value={subtasks}
                onChange={(event) => setSubtasks(event.target.value)}
                placeholder={m.subtasks_placeholder()}
                className="min-h-28 resize-y border-border/60 bg-background/80"
              />
            </fieldset>
          </div>
        </section>
      </form>
    </AppDialog>
  );
}
