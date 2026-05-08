import { useEffect, useRef, useState } from "react";

import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  projects: _projects,
  onClose,
  onSubmit,
}: CreateBoardConversationDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
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
    setSubmitting(true);
    try {
      await onSubmit({
        title: nextTitle,
        description: description.trim(),
        projectId: undefined,
        dueDate: undefined,
        priority: "medium",
        tags: [],
        subtasks: [],
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
        <section className="rounded-xl bg-muted/[0.18] p-4">
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

      </form>
    </AppDialog>
  );
}
