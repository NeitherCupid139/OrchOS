"use client";

import * as React from "react";
import { Popover } from "@base-ui/react/popover";
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface DatePickerProps {
  value?: Date | undefined;
  onChange?: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
  id?: string;
}

function parseDateInput(raw: string): Date | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  )
    return undefined;
  return d;
}

export function DatePicker({
  value,
  onChange,
  className,
  placeholder = "YYYY-MM-DD",
  id,
}: DatePickerProps) {
  const [month, setMonth] = React.useState(() => value ?? new Date());
  const [inputText, setInputText] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (value) {
      setMonth(value);
      setInputText(format(value, "yyyy-MM-dd"));
    } else {
      setInputText("");
    }
  }, [value]);

  const handleDateSelect = (date: Date) => {
    onChange?.(date);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputText(raw);
    const parsed = parseDateInput(raw);
    if (parsed) {
      onChange?.(parsed);
    }
  };

  const handleInputBlur = () => {
    if (value) {
      setInputText(format(value, "yyyy-MM-dd"));
    } else {
      setInputText("");
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const parsed = parseDateInput(inputText);
      if (parsed) {
        onChange?.(parsed);
        setOpen(false);
      }
    }
  };

  const days = React.useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month)),
        end: endOfWeek(endOfMonth(month)),
      }),
    [month],
  );

  const goToPrevious = () => setMonth((m) => add(m, { months: -1 }));
  const goToNext = () => setMonth((m) => add(m, { months: 1 }));

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <div
            className={cn(
              "flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background/80 px-3 py-2 text-sm transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
              className,
            )}
          >
            <HugeiconsIcon
              icon={Calendar01Icon}
              className="size-4 shrink-0 text-muted-foreground"
            />
            <input
              id={id}
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        }
      />
      <Popover.Portal>
        <Popover.Positioner
          sideOffset={6}
          className="z-[70]"
        >
          <Popover.Popup className="origin-(--transform-origin) rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={goToPrevious}
                aria-label={m.previous()}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
              </Button>
              <span className="text-sm font-medium tabular-nums">
                {format(month, "MMMM yyyy")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={goToNext}
                aria-label={m.next()}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
              </Button>
            </div>

            <div className="mt-3 grid grid-cols-7 text-center text-xs text-muted-foreground">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day) => (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={cn(
                    "flex h-8 w-full items-center justify-center rounded-md text-sm tabular-nums transition-colors hover:bg-muted",
                    !isSameMonth(day, month) && "text-muted-foreground/40",
                    value && isSameDay(day, value) && "bg-primary text-primary-foreground hover:bg-primary/90",
                    isToday(day) && !(value && isSameDay(day, value)) && "bg-foreground text-background",
                  )}
                >
                  {format(day, "d")}
                </button>
              ))}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
