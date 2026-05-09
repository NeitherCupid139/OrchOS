import { useState, useEffect, useRef } from "react";
import { m } from "@/paraglide/messages";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";

interface RenameDialogProps {
  open: boolean;
  title: string;
  initialValue: string;
  placeholder?: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function RenameDialog({
  open,
  title,
  initialValue,
  placeholder,
  onClose,
  onSubmit,
}: RenameDialogProps) {
  const [name, setName] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(initialValue);
      const timeoutId = window.setTimeout(() => inputRef.current?.focus(), 50);

      return () => window.clearTimeout(timeoutId);
    }
  }, [open, initialValue]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title={title}
      size="sm"
      bodyClassName="pt-5"
      footer={
        <>
          <Button size="sm" type="button" variant="outline" onClick={onClose}>
            {m.cancel()}
          </Button>
          <Button size="sm" type="submit" form="rename-dialog-form" disabled={!name.trim()}>
            {m.save()}
          </Button>
        </>
      }
    >
      <form id="rename-dialog-form" onSubmit={handleSubmit} className="space-y-4">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>
    </AppDialog>
  );
}
