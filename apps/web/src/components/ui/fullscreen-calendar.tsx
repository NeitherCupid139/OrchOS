"use client";

import * as React from "react";
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfToday,
  startOfWeek,
} from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusCircleIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export type FullScreenCalendarViewMode = "day" | "week" | "month";
export type FullScreenCalendarSource = "calendar" | "task";

export interface FullScreenCalendarEvent {
  id: number | string;
  name: string;
  time: string;
  datetime: string;
  endDatetime?: string;
  source?: FullScreenCalendarSource;
  color?: string;
  status?: string;
}

export interface FullScreenCalendarDay {
  day: Date;
  events: FullScreenCalendarEvent[];
}

interface FullScreenCalendarProps {
  data: FullScreenCalendarDay[];
  currentMonth: Date;
  selectedDay: Date;
  viewMode: FullScreenCalendarViewMode;
  onSelectDay: (day: Date) => void;
  onCurrentMonthChange: (day: Date) => void;
  onCreateEvent?: () => void;
  onCreateSlot?: (start: Date, end: Date) => void;
  onUpdateTaskEvent?: (eventId: string, updates: { start: Date; end: Date }) => void;
  onCycleTaskStatus?: (eventId: string) => void;
  onOpenEvent?: (event: FullScreenCalendarEvent) => void;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });

export function FullScreenCalendar({
  data,
  currentMonth,
  selectedDay,
  viewMode,
  onSelectDay,
  onCurrentMonthChange,
  onCreateEvent,
  onCreateSlot,
  onUpdateTaskEvent,
  onCycleTaskStatus,
  onOpenEvent,
}: FullScreenCalendarProps) {
  const today = startOfToday();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const monthDays = React.useMemo(
    () =>
      eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      }),
    [currentMonth],
  );
  const weekDays = React.useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(selectedDay),
        end: endOfWeek(selectedDay),
      }),
    [selectedDay],
  );
  const visibleDays = viewMode === "week" ? weekDays : monthDays;
  const dayGroups = React.useMemo(
    () =>
      [...data]
        .map((group) => ({
          ...group,
          events: group.events.toSorted((left, right) => {
            return new Date(left.datetime).getTime() - new Date(right.datetime).getTime();
          }),
        }))
        .sort((left, right) => left.day.getTime() - right.day.getTime()),
    [data],
  );
  const selectedDayEvents = React.useMemo(
    () => dayGroups.find((item) => isSameDay(item.day, selectedDay))?.events ?? [],
    [dayGroups, selectedDay],
  );
  const selectedWeekEvents = React.useMemo(
    () =>
      weekDays.map((day) => ({
        day,
        events: dayGroups.find((item) => isSameDay(item.day, day))?.events ?? [],
      })),
    [dayGroups, weekDays],
  );

  function previousRange() {
    if (viewMode === "month") {
      onCurrentMonthChange(add(currentMonth, { months: -1 }));
      return;
    }

    onSelectDay(add(selectedDay, { days: viewMode === "week" ? -7 : -1 }));
  }

  function nextRange() {
    if (viewMode === "month") {
      onCurrentMonthChange(add(currentMonth, { months: 1 }));
      return;
    }

    onSelectDay(add(selectedDay, { days: viewMode === "week" ? 7 : 1 }));
  }

  function goToToday() {
    if (viewMode === "month") {
      onCurrentMonthChange(today);
    }
    onSelectDay(today);
  }

  const weekdayLabels = React.useMemo(
    () => Array.from({ length: 7 }, (_, index) => weekdayFormatter.format(new Date(2024, 0, 7 + index))),
    [weekdayFormatter],
  );
  const headerTitle = React.useMemo(() => {
    if (viewMode === "day") {
      return format(selectedDay, "MMMM d, yyyy");
    }

    if (viewMode === "week") {
      return `${format(startOfWeek(selectedDay), "MMM d")} - ${format(endOfWeek(selectedDay), "MMM d, yyyy")}`;
    }

    return format(currentMonth, "MMMM, yyyy");
  }, [currentMonth, selectedDay, viewMode]);
  const headerSubtitle = React.useMemo(() => {
    if (viewMode === "day") {
      return weekdayFormatter.format(selectedDay);
    }

    if (viewMode === "week") {
      return `${format(startOfWeek(selectedDay), "MMM d, yyyy")} - ${format(endOfWeek(selectedDay), "MMM d, yyyy")}`;
    }

    return `${format(startOfMonth(currentMonth), "MMM d, yyyy")} - ${format(endOfMonth(currentMonth), "MMM d, yyyy")}`;
  }, [currentMonth, selectedDay, viewMode, weekdayFormatter]);

  return (
    <div className="flex min-h-0 flex-1 flex-col antialiased">
      <div className="flex flex-col gap-4 border-b border-border/70 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-auto">
          <div className="flex items-center gap-4">
            <div className="hidden w-20 flex-col items-center justify-center rounded-xl border border-border/70 bg-muted/40 p-1 md:flex">
              <h1 className="p-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {format(today, "MMM")}
              </h1>
              <div className="flex w-full items-center justify-center rounded-lg border border-border/70 bg-background p-1 text-lg font-bold tabular-nums shadow-sm">
                <span>{format(today, "d")}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <h2 className="text-balance text-lg font-semibold text-foreground">
                {headerTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                {headerSubtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-4">
          <div className="inline-flex w-full -space-x-px rounded-xl shadow-sm shadow-black/5 md:w-auto rtl:space-x-reverse">
            <Button
              onClick={previousRange}
              className="rounded-none shadow-none first:rounded-s-xl last:rounded-e-xl focus-visible:z-10 active:scale-[0.96]"
              variant="outline"
              size="icon"
              aria-label={m.previous()}
            >
              <ChevronLeftIcon size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
            <Button
              onClick={goToToday}
              className="w-full rounded-none shadow-none first:rounded-s-xl last:rounded-e-xl focus-visible:z-10 md:w-auto active:scale-[0.96]"
              variant="outline"
            >
              {m.today()}
            </Button>
            <Button
              onClick={nextRange}
              className="rounded-none shadow-none first:rounded-s-xl last:rounded-e-xl focus-visible:z-10 active:scale-[0.96]"
              variant="outline"
              size="icon"
              aria-label={m.next()}
            >
              <ChevronRightIcon size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
          </div>

          <Separator orientation="vertical" className="hidden h-6 md:block" />
          <Separator orientation="horizontal" className="block w-full md:hidden" />

          <Button className="w-full gap-2 md:w-auto active:scale-[0.96]" onClick={onCreateEvent}>
            <PlusCircleIcon size={16} strokeWidth={2} aria-hidden="true" />
            <span>{m.calendar_add_event()}</span>
          </Button>
        </div>
      </div>

      {viewMode === "day" ? (
        <DayTimelineView
          day={selectedDay}
          events={selectedDayEvents}
          onCreateSlot={onCreateSlot}
          onUpdateTaskEvent={onUpdateTaskEvent}
          onCycleTaskStatus={onCycleTaskStatus}
          onOpenEvent={onOpenEvent}
        />
      ) : viewMode === "week" ? (
        <WeekTimelineView
          days={selectedWeekEvents}
          onSelectDay={onSelectDay}
          selectedDay={selectedDay}
          onCreateSlot={onCreateSlot}
          onUpdateTaskEvent={onUpdateTaskEvent}
          onCycleTaskStatus={onCycleTaskStatus}
          onOpenEvent={onOpenEvent}
        />
      ) : (
        <MonthGridView
          days={visibleDays}
          currentMonth={currentMonth}
          selectedDay={selectedDay}
          data={dayGroups}
          isDesktop={isDesktop}
          weekdayLabels={weekdayLabels}
          onSelectDay={onSelectDay}
          onOpenEvent={onOpenEvent}
        />
      )}
    </div>
  );
}

function DayTimelineView({
  day,
  events,
  onCreateSlot,
  onUpdateTaskEvent,
  onCycleTaskStatus,
  onOpenEvent,
}: {
  day: Date;
  events: FullScreenCalendarEvent[];
  onCreateSlot?: (start: Date, end: Date) => void;
  onUpdateTaskEvent?: (eventId: string, updates: { start: Date; end: Date }) => void;
  onCycleTaskStatus?: (eventId: string) => void;
  onOpenEvent?: (event: FullScreenCalendarEvent) => void;
}) {
  const now = new Date();
  const showNowLine = isSameDay(day, now);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-[72px_minmax(0,1fr)] border-b border-border/70 px-4 py-3">
        <div />
        <div className="text-sm font-semibold text-foreground">
          {format(day, "EEEE, MMM d")}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-[72px_minmax(0,1fr)] px-4">
          <div className="border-r border-border/60 pr-3">
            {HOURS.map((hour) => (
              <div key={hour} className="relative h-20 text-right text-[11px] text-muted-foreground tabular-nums">
                <span className="-translate-y-2 inline-block bg-background pr-1">
                  {formatHour(hour)}
                </span>
              </div>
            ))}
          </div>
          <div className="relative">
            {HOURS.map((hour) => (
              <div key={hour} className="relative h-20 border-b border-dashed border-border/50">
                <div className="absolute inset-x-0 top-10 border-t border-border/30" />
              </div>
            ))}

            {showNowLine ? (
              <div
                suppressHydrationWarning
                className="pointer-events-none absolute inset-x-0 z-10 border-t border-rose-500/90"
                style={{ top: `${getCurrentTimeOffset(now)}px` }}
              >
                <div className="absolute -left-1.5 -top-1.5 size-3 rounded-full bg-rose-500" />
              </div>
            ) : null}

            {onCreateSlot ? (
              <div className="absolute inset-0" suppressHydrationWarning>
                {HOURS.flatMap((hour) =>
                  [0, 30].map((minute) => {
                    const slotStart = new Date(day);
                    slotStart.setHours(hour, minute, 0, 0);
                    const slotEnd = add(slotStart, { minutes: 30 });
                    return (
                      <button
                        key={`${hour}-${minute}`}
                        type="button"
                        className="absolute inset-x-0 z-0 cursor-copy hover:bg-primary/5"
                        style={{ top: `${hour * 80 + (minute === 30 ? 40 : 0)}px`, height: "40px" }}
                        onClick={() => onCreateSlot(slotStart, slotEnd)}
                      />
                    );
                  }),
                )}
              </div>
            ) : null}

            <div className="absolute inset-0">
              {events.map((event) => {
                const style = getTimelineStyle(event);
                return (
                  <button
                    key={event.id}
                    type="button"
                    className={cn(
                      "absolute left-3 right-3 rounded-2xl border p-3 text-left shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)]",
                      event.source === "task"
                        ? "border-sky-400/40 bg-sky-500/8"
                        : "border-emerald-400/35 bg-emerald-500/8",
                    )}
                    style={style}
                    onClick={() => onOpenEvent?.(event)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">
                          {event.name}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {event.time}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {event.source === "task" && onCycleTaskStatus ? (
                          <button
                            type="button"
                            className="rounded-full px-2 py-1 text-[10px] font-medium tabular-nums text-muted-foreground hover:bg-background/60"
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              onCycleTaskStatus(String(event.id));
                            }}
                          >
                            {event.status ?? "task"}
                          </button>
                        ) : null}
                        <span className="rounded-full px-2 py-1 text-[10px] font-medium tabular-nums text-muted-foreground">
                          {event.source === "task" ? "Task" : "Event"}
                        </span>
                      </div>
                    </div>
                    {event.source === "task" && onUpdateTaskEvent ? (
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            onUpdateTaskEvent(String(event.id), {
                              start: add(parseISO(event.datetime), { minutes: -30 }),
                              end: add(parseISO(event.endDatetime ?? event.datetime), { minutes: -30 }),
                            });
                          }}
                        >
                          -30m
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            onUpdateTaskEvent(String(event.id), {
                              start: add(parseISO(event.datetime), { minutes: 30 }),
                              end: add(parseISO(event.endDatetime ?? event.datetime), { minutes: 30 }),
                            });
                          }}
                        >
                          +30m
                        </Button>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekTimelineView({
  days,
  onSelectDay,
  selectedDay,
  onCreateSlot,
  onUpdateTaskEvent,
  onCycleTaskStatus,
  onOpenEvent,
}: {
  days: Array<{ day: Date; events: FullScreenCalendarEvent[] }>;
  onSelectDay: (day: Date) => void;
  selectedDay: Date;
  onCreateSlot?: (start: Date, end: Date) => void;
  onUpdateTaskEvent?: (eventId: string, updates: { start: Date; end: Date }) => void;
  onCycleTaskStatus?: (eventId: string) => void;
  onOpenEvent?: (event: FullScreenCalendarEvent) => void;
}) {
  const now = new Date();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-border/70">
        <div className="border-r border-border/60 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground" />
        {days.map(({ day }) => (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelectDay(day)}
            className={cn(
              "border-r border-border/60 px-3 py-2 text-left transition-colors hover:bg-accent/30",
              isSameDay(day, selectedDay) && "bg-primary/5",
            )}
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {format(day, "EEE")}
            </div>
            <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
              {format(day, "d")}
            </div>
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] px-0">
          <div className="border-r border-border/60 px-3">
            {HOURS.map((hour) => (
              <div key={hour} className="relative h-20 text-right text-[11px] text-muted-foreground tabular-nums">
                <span className="-translate-y-2 inline-block bg-background pr-1">
                  {formatHour(hour)}
                </span>
              </div>
            ))}
          </div>

          {days.map(({ day, events }) => (
            <div key={day.toISOString()} className="relative border-r border-border/60">
              {HOURS.map((hour) => (
                <div key={hour} className="relative h-20 border-b border-dashed border-border/50">
                  <div className="absolute inset-x-0 top-10 border-t border-border/30" />
                </div>
              ))}
              {isSameDay(day, now) ? (
                <div
                  suppressHydrationWarning
                  className="pointer-events-none absolute inset-x-0 z-10 border-t border-rose-500/90"
                  style={{ top: `${getCurrentTimeOffset(now)}px` }}
                >
                  <div className="absolute -left-1.5 -top-1.5 size-3 rounded-full bg-rose-500" />
                </div>
              ) : null}
              {onCreateSlot ? (
                <div className="absolute inset-0" suppressHydrationWarning>
                  {HOURS.flatMap((hour) =>
                    [0, 30].map((minute) => {
                      const slotStart = new Date(day);
                      slotStart.setHours(hour, minute, 0, 0);
                      const slotEnd = add(slotStart, { minutes: 30 });
                      return (
                        <button
                          key={`${day.toISOString()}-${hour}-${minute}`}
                          type="button"
                          className="absolute inset-x-0 z-0 cursor-copy hover:bg-primary/5"
                          style={{ top: `${hour * 80 + (minute === 30 ? 40 : 0)}px`, height: "40px" }}
                          onClick={() => onCreateSlot(slotStart, slotEnd)}
                        />
                      );
                    }),
                  )}
                </div>
              ) : null}
              <div className="absolute inset-0">
                {events.map((event) => {
                  const style = getTimelineStyle(event);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      className={cn(
                        "absolute left-1.5 right-1.5 rounded-xl border p-2 text-left shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]",
                        event.source === "task"
                          ? "border-sky-400/40 bg-sky-500/8"
                          : "border-emerald-400/35 bg-emerald-500/8",
                      )}
                      style={style}
                      onClick={() => onOpenEvent?.(event)}
                    >
                      <div className="truncate text-xs font-medium text-foreground">
                        {event.name}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {event.time}
                      </div>
                      {event.source === "task" ? (
                        <div className="mt-1 flex items-center gap-1">
                          {onCycleTaskStatus ? (
                            <button
                              type="button"
                              className="rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              onClick={(clickEvent) => {
                                clickEvent.stopPropagation();
                                onCycleTaskStatus(String(event.id));
                              }}
                            >
                              {event.status ?? "task"}
                            </button>
                          ) : null}
                          {onUpdateTaskEvent ? (
                            <button
                              type="button"
                              className="rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              onClick={(clickEvent) => {
                                clickEvent.stopPropagation();
                                onUpdateTaskEvent(String(event.id), {
                                  start: add(parseISO(event.datetime), { minutes: 30 }),
                                  end: add(parseISO(event.endDatetime ?? event.datetime), { minutes: 30 }),
                                });
                              }}
                            >
                              +30m
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthGridView({
  days,
  currentMonth,
  selectedDay,
  data,
  isDesktop,
  weekdayLabels,
  onSelectDay,
  onOpenEvent,
}: {
  days: Date[];
  currentMonth: Date;
  selectedDay: Date;
  data: FullScreenCalendarDay[];
  isDesktop: boolean;
  weekdayLabels: string[];
  onSelectDay: (day: Date) => void;
  onOpenEvent?: (event: FullScreenCalendarEvent) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-7 border-y border-border/70 text-center text-xs font-semibold leading-6">
        {weekdayLabels.map((label, index) => (
          <div key={label} className={cn("py-2.5", index < 6 && "border-r border-border/60")}>
            {label}
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isDesktop ? (
          <div className="grid min-h-full grid-cols-7">
            {days.map((day) => {
              const dayEvents = data.find((item) => isSameDay(item.day, day))?.events ?? [];
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "flex min-h-[148px] flex-col border-b border-r border-border/60 px-3 py-3 text-left transition-colors hover:bg-accent/30",
                    !isSameMonth(day, currentMonth) && "bg-muted/30 text-muted-foreground",
                    isSameDay(day, selectedDay) && "bg-primary/5",
                  )}
                >
                  <button type="button" onClick={() => onSelectDay(day)} className="flex items-center justify-between text-left">
                    <span
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-full text-sm font-medium tabular-nums",
                        isToday(day) && "bg-foreground text-background",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {dayEvents.length}
                    </span>
                  </button>

                  <div className="mt-3 space-y-1.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onOpenEvent?.(event)}
                        className={cn(
                          "block w-full truncate rounded-lg px-2 py-1 text-left text-[11px] font-medium transition-colors hover:bg-background/70",
                          event.source === "task"
                            ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                        )}
                      >
                        {event.name}
                      </button>
                    ))}
                    {dayEvents.length > 3 ? (
                      <div className="text-[11px] text-muted-foreground">
                        +{dayEvents.length - 3} {m.calendar_n_more({ n: dayEvents.length - 3 })}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayEvents = data.find((item) => isSameDay(item.day, day))?.events ?? [];
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className={cn(
                    "flex h-16 flex-col border-b border-r border-border/60 px-2 py-2 transition-colors hover:bg-accent/30",
                    !isSameMonth(day, currentMonth) && "bg-muted/30 text-muted-foreground",
                    isSameDay(day, selectedDay) && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "ml-auto flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                      isToday(day) && "bg-foreground text-background",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="-mx-0.5 mt-auto flex flex-wrap-reverse">
                    {dayEvents.slice(0, 4).map((event) => (
                      <span
                        key={event.id}
                        className={cn(
                          "mx-0.5 mt-1 h-1.5 w-1.5 rounded-full",
                          event.source === "task" ? "bg-sky-500" : "bg-emerald-500",
                        )}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getTimelineStyle(event: FullScreenCalendarEvent) {
  const start = parseISO(event.datetime);
  const end = event.endDatetime ? parseISO(event.endDatetime) : add(start, { hours: event.source === "task" ? 1 : 1 });
  const dayStart = startOfDay(start);
  const startMinutes = Math.max(0, (start.getTime() - dayStart.getTime()) / 60_000);
  const endMinutes = Math.max(startMinutes + 45, (end.getTime() - dayStart.getTime()) / 60_000);
  const top = (startMinutes / 60) * 80;
  const height = Math.max(56, ((endMinutes - startMinutes) / 60) * 80);

  return {
    top: `${top}px`,
    height: `${height}px`,
  };
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${suffix}`;
}

function getCurrentTimeOffset(date: Date) {
  return ((date.getHours() * 60 + date.getMinutes()) / 60) * 80;
}
