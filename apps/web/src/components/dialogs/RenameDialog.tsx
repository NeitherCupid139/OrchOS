import { useEffect, useRef, useState } from "react";
import { cancel, save } from "@/paraglide/messages";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";
import { cn } from "@/lib/utils";

export interface IconOption {
  value: string;
  icon: IconSvgElement;
}

const PRESET_COLORS = [
  { value: "#6b7280", label: "Gray" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Amber" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
] as const;

interface RenameDialogProps {
  open: boolean;
  title: string;
  initialValue: string;
  placeholder?: string;
  onClose: () => void;
  onSubmit: (name: string, icon?: string, color?: string) => void;
  iconValue?: string;
  availableIcons?: IconOption[];
  colorValue?: string;
  availableColors?: readonly { value: string; label: string }[];
}

export function RenameDialog({
  open,
  title,
  initialValue,
  placeholder,
  onClose,
  onSubmit,
  iconValue,
  availableIcons,
  colorValue,
  availableColors = PRESET_COLORS,
}: RenameDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIcon, setSelectedIcon] = useState(iconValue);
  const [selectedColor, setSelectedColor] = useState(colorValue);

  useEffect(() => {
    if (!open) return;

    // Reset selection when dialog opens
    setSelectedIcon(iconValue);
    setSelectedColor(colorValue);

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [open, iconValue, colorValue]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = inputRef.current?.value.trim();
    if (name) onSubmit(name, selectedIcon, selectedColor);
  };

  const showIconPicker = availableIcons && availableIcons.length > 0;

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
            {cancel()}
          </Button>
          <Button size="sm" type="submit" form="rename-dialog-form">
            {save()}
          </Button>
        </>
      }
    >
      <form id="rename-dialog-form" onSubmit={handleSubmit} className="space-y-4">
        <input
          ref={inputRef}
          type="text"
          defaultValue={initialValue}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
        />
        {showIconPicker && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Icon</span>
            <div className="grid grid-cols-6 gap-2">
              {availableIcons.map((option) => {
                const isSelected = selectedIcon === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedIcon(option.value)}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg border transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:border-foreground/20",
                    )}
                  >
                    <HugeiconsIcon
                      icon={option.icon}
                      className="size-4"
                      color={isSelected && selectedColor ? selectedColor : undefined}
                    />
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {availableColors.map((c) => {
                const isActive = selectedColor === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-label={c.label}
                    onClick={() => setSelectedColor(isActive ? undefined : c.value)}
                    className={cn(
                      "size-6 rounded-full border-2 transition-all",
                      isActive
                        ? "border-foreground scale-110 shadow-sm"
                        : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </form>
    </AppDialog>
  );
}
