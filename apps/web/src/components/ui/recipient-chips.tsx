import { useState, useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from "react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

interface RecipientChipsProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Chip-based recipient input for email To/CC/BCC fields.
 * Converts comma/enter/semicolon-separated input into deletable chips.
 */
export function RecipientChips({
  value,
  onChange,
  placeholder = "email@example.com",
  className,
  disabled = false,
}: RecipientChipsProps) {
  const [inputValue, setInputValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const chips = value
    .split(",")
    .flatMap((e) => { const v = e.trim(); return v ? [v] : []; });

  const syncChips = useCallback(
    (nextChips: string[]) => {
      onChange(nextChips.join(", "));
    },
    [onChange],
  );

  const addChip = useCallback(
    (raw: string) => {
      const email = raw.trim();
      if (!email) return;
      // Don't add duplicates
      if (chips.includes(email)) {
        setInputValue("");
        return;
      }
      syncChips([...chips, email]);
      setInputValue("");
    },
    [chips, syncChips],
  );

  const removeChip = useCallback(
    (index: number) => {
      syncChips(chips.filter((_, i) => i !== index));
    },
    [chips, syncChips],
  );

  const removeLastChip = useCallback(() => {
    if (inputValue === "" && chips.length > 0) {
      syncChips(chips.slice(0, -1));
    }
  }, [chips, inputValue, syncChips]);

  const handleChipInput = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === "," || e.key === ";") {
        e.preventDefault();
        addChip(inputValue);
      } else if (e.key === "Backspace") {
        removeLastChip();
      }
    },
    [addChip, inputValue, removeLastChip],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData("text/plain");
      // If pasted text contains commas or semicolons, split into chips
      if (pasted.includes(",") || pasted.includes(";") || pasted.includes("\n")) {
        e.preventDefault();
        const emails = pasted
          .split(/[,;\n]+/)
          .flatMap((s) => { const v = s.trim(); return v ? [v] : []; });
        if (emails.length > 0) {
          const existing = new Set(chips);
          const newEmails = emails.filter((e) => !existing.has(e));
          if (newEmails.length > 0) {
            syncChips([...chips, ...newEmails]);
          }
        }
      }
    },
    [chips, syncChips],
  );

  const commitChipFromBlur = useCallback(() => {
    // Add any remaining input as a chip on blur
    if (inputValue.trim()) {
      addChip(inputValue);
    }
    setFocused(false);
  }, [addChip, inputValue]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex min-h-[38px] w-full flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 transition-colors",
        focused && "border-blue-400 ring-1 ring-blue-400/20",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      role="button"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {chips.map((chip, index) => (
        <span
          key={`${chip}-${index}`}
          className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/60 px-2.5 py-0.5 text-[13px] leading-5 text-foreground transition-colors hover:bg-muted"
        >
          <span className="max-w-[180px] truncate">{chip}</span>
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeChip(index);
              }}
              className="ml-0.5 flex shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
              tabIndex={-1}
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
            </button>
          )}
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleChipInput}
        onPaste={handlePaste}
        onFocus={() => setFocused(true)}
        onBlur={commitChipFromBlur}
        aria-label={placeholder}
        placeholder={chips.length === 0 ? placeholder : ""}
        disabled={disabled}
        className="min-w-[120px] flex-1 border-0 bg-transparent px-1 py-0.5 text-[13px] leading-5 text-foreground outline-none placeholder:text-muted-foreground/60"
      />
    </div>
  );
}
