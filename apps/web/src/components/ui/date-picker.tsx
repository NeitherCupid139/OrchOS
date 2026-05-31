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
import { date_picker_placeholder, date_picker_weekday_fri, date_picker_weekday_mon, date_picker_weekday_sat, date_picker_weekday_sun, date_picker_weekday_thu, date_picker_weekday_tue, date_picker_weekday_wed, next, previous } from "@/paraglide/messages";

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
  placeholder = date_picker_placeholder(),
  id,
}: DatePickerProps) {
  // Store user's explicit calendar navigation; derives from value when stale
  const [userMonth, setUserMonth] = React.useState<Date | null>(null);
  const month = userMonth ?? value ?? new Date();

  // Store user's text input with a discriminator so it resets when value changes
  const [inputOverride, setInputOverride] = React.useState<{
    for: Date | undefined;
    text: string;
  } | null>(null);
  const inputText =
    inputOverride && inputOverride.for === value
      ? inputOverride.text
      : value
        ? format(value, "yyyy-MM-dd")
        : "";

  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDateSelect = (date: Date) => {
    onChange?.(date);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputOverride({ for: value, text: raw });
    const parsed = parseDateInput(raw);
    if (parsed) {
      onChange?.(parsed);
    }
  };

  const handleInputBlur = () => {
    setInputOverride(null);
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
      [month.getTime()],
  );

  const goToPrevious = () => setUserMonth(add(month, { months: -1 }));
  const goToNext = () => setUserMonth(add(month, { months: 1 }));
  const weekdays = [
    date_picker_weekday_sun(),
    date_picker_weekday_mon(),
    date_picker_weekday_tue(),
    date_picker_weekday_wed(),
    date_picker_weekday_thu(),
    date_picker_weekday_fri(),
    date_picker_weekday_sat(),
  ];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <div
            className={cn(
              "flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background/80 px-3 py-2 text-sm transition-colors focus-within:outline-none focus-within:ring-[0.5px] focus-within:ring-ring/20 focus-within:ring-offset-2",
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
              aria-label={placeholder}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        }
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} className="z-[70]">
          <Popover.Popup className="origin-(--transform-origin) min-w-[19rem] w-[max(19rem,var(--anchor-width))] rounded-2xl border border-border/70 bg-popover p-3 text-popover-foreground shadow-xl ring-1 ring-black/5 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={goToPrevious}
                aria-label={previous()}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
              </Button>
              <span className="flex-1 text-center text-sm font-medium tabular-nums">
                {format(month, "MMMM yyyy")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={goToNext}
                aria-label={next()}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
              </Button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
              {weekdays.map((d) => (
                <div key={d} className="flex h-8 items-center justify-center">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl text-sm tabular-nums transition-colors hover:bg-muted active:scale-[0.96]",
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
