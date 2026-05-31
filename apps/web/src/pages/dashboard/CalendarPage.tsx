import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  Calendar03Icon,
  Calendar04Icon,
  CalendarCheckIn01Icon,
  CalendarFavorite01Icon,
  CalendarLove01Icon,
  CalendarUserIcon,
  CalendarsIcon,
  Delete02Icon,
  Edit02Icon,
  ViewOffSlashIcon,
  SquareArrowDataTransferHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AppDialog } from "@/components/ui/app-dialog";
import { ColorSelector } from "@/components/ui/color-selector";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  FullScreenCalendar,
  type FullScreenCalendarDay,
} from "@/components/ui/fullscreen-calendar";
import { EmptyState } from "@/components/ui/interactive-empty-state";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  api,
  type PlannerCalendar as LocalCalendar,
  type PlannerCalendarEvent as LocalCalendarEvent,
  type PlannerReminder,
  type PlannerStore as LocalCalendarStore,
} from "@/lib/api";
import { useBoardStore } from "@/lib/stores/board";
import {
  getReminderDisplayText,
  getReminderNextOccurrence,
} from "@/lib/planner-reminders";
import { useUIStore } from "@/lib/store";
import type { BoardTaskColumnId } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  add,
  calendar,
  calendar_add_event,
  calendar_all_day,
  calendar_all_day_event,
  calendar_calendar_name,
  calendar_create_calendar_first,
  calendar_delete_calendar,
  calendar_delete_calendar_confirm,
  calendar_edit_calendar,
  calendar_edit_event,
  calendar_empty_workspace_desc,
  calendar_empty_workspace_title,
  calendar_end,
  calendar_event_title,
  calendar_event_title_placeholder,
  calendar_failed_load_integrations,
  calendar_icon,
  calendar_local_calendar_desc,
  calendar_local_event_desc,
  calendar_location,
  calendar_location_placeholder,
  calendar_name_placeholder,
  calendar_new_calendar,
  calendar_no_groups_desc,
  calendar_notes,
  calendar_start,
  cancel,
  close,
  collapse_sidebar,
  color,
  delete as delete_message,
  edit,
  expand_sidebar,
  resize_calendar_sidebar,
  save,
} from "@/paraglide/messages";

type ReminderRenderableEvent = {
  id: string;
  calendarId: "planner-reminders";
  title: string;
  description: string;
  location: "";
  startAt: string;
  endAt: string;
  allDay: false;
  provider: "local";
  source: "task";
  status: string;
};

type CalendarRenderableEvent =
  | (LocalCalendarEvent & {
      source?: "calendar" | "task";
    })
  | ReminderRenderableEvent;

type CalendarEventDetail = {
  event: CalendarRenderableEvent;
  task?: ReturnType<typeof useBoardStore.getState>["tasks"][number];
  calendar?: LocalCalendar;
};

type LocalCalendarFormState = {
  id: string | null;
  groupId: string;
  name: string;
  color: string;
  description: string;
  icon: string;
};

type LocalEventFormState = {
  id: string | null;
  calendarId: string;
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
};

const LOCAL_CALENDAR_COLORS = [
  "#7c3aed",
  "#2563eb",
  "#0891b2",
  "#059669",
  "#ea580c",
  "#dc2626",
  "#db2777",
];
const LOCAL_CALENDAR_ICONS: {
  name: string;
  component: typeof Calendar03Icon;
}[] = [
  { name: "Calendar01", component: Calendar01Icon },
  { name: "Calendar03", component: Calendar03Icon },
  { name: "Calendar04", component: Calendar04Icon },
  { name: "CalendarCheckIn01", component: CalendarCheckIn01Icon },
  { name: "CalendarFavorite01", component: CalendarFavorite01Icon },
  { name: "CalendarLove01", component: CalendarLove01Icon },
  { name: "CalendarUser", component: CalendarUserIcon },
  { name: "Calendars", component: CalendarsIcon },
];

function offsetDateTime(value: string, offsetMinutes: number) {
  return new Date(new Date(value).getTime() + offsetMinutes * 60_000);
}

export function CalendarPage() {
  const selectedSidebarItem = useUIStore((s) => s.calendarSelectedSidebarItem);
  const setSelectedSidebarItem = useUIStore(
    (s) => s.setCalendarSelectedSidebarItem,
  );
  const [hiddenCalendarIds, setHiddenCalendarIds] = useState<string[]>([]);
  const [isLocalCalendarDialogOpen, setIsLocalCalendarDialogOpen] =
    useState(false);
  const [isLocalEventDialogOpen, setIsLocalEventDialogOpen] = useState(false);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(true);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [localStore, setLocalStore] = useState<LocalCalendarStore>(
    createInitialLocalCalendarStore,
  );
  const selectedLocalDate = useUIStore((s) => s.calendarSelectedLocalDate);
  const setSelectedLocalDate = useUIStore(
    (s) => s.setCalendarSelectedLocalDate,
  );
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(parseDayKey(selectedLocalDate)),
  );
  const calendarViewMode = useUIStore((s) => s.calendarViewMode);
  const calendarSourceFilter = useUIStore((s) => s.calendarSourceFilter);
  const boardTasks = useBoardStore((state) => state.tasks);
  const [selectedEventDetailId, setSelectedEventDetailId] = useState<
    string | null
  >(null);
  const [calendarPendingDelete, setCalendarPendingDelete] =
    useState<LocalCalendar | null>(null);
  const [localCalendarForm, setLocalCalendarForm] =
    useState<LocalCalendarFormState>({
      id: null,
      groupId: "",
      name: "",
      color: LOCAL_CALENDAR_COLORS[0],
      description: "",
      icon: "Calendar03",
    });
  const [localEventForm, setLocalEventForm] = useState<LocalEventFormState>(
    () => createEmptyEventForm(),
  );
  const collapseTimerRef = useRef<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  const localCalendars = localStore.calendars;
  const localEvents = localStore.events;
  const reminders = localStore.reminders;
  const hasSidebarCalendars = localCalendars.length > 0;

  const activeLocalCalendarIds = useMemo(() => {
    return localCalendars.flatMap((calendar) =>
      !hiddenCalendarIds.includes(calendar.id) ? [calendar.id] : [],
    );
  }, [hiddenCalendarIds, localCalendars]);

  const localEventsInScope = useMemo(() => {
    const ids = new Set(activeLocalCalendarIds);

    return localEvents
      .filter((event) => ids.has(event.calendarId))
      .sort(
        (left, right) =>
          new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
      );
  }, [activeLocalCalendarIds, localEvents]);

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, LocalCalendarEvent[]>();

    for (const event of localEventsInScope) {
      const dayKey = formatDayKey(new Date(event.startAt));
      const bucket = grouped.get(dayKey) ?? [];
      bucket.push(event);
      grouped.set(dayKey, bucket);
    }

    return grouped;
  }, [localEventsInScope]);

  const renderableEvents = useMemo<CalendarRenderableEvent[]>(
    () => [
      ...localEventsInScope.map((event) => ({
        ...event,
        source: "calendar" as const,
      })),
      ...boardTasksToCalendarEvents(boardTasks),
      ...plannerRemindersToCalendarEvents(reminders),
    ],
    [boardTasks, localEventsInScope, reminders],
  );

  const fullScreenCalendarData = useMemo<FullScreenCalendarDay[]>(
    () =>
      renderableEvents
        .filter((event) => {
          if (calendarSourceFilter === "events") return event.source !== "task";
          if (calendarSourceFilter === "tasks") return event.source === "task";
          return true;
        })
        .reduce<FullScreenCalendarDay[]>((groups, event) => {
          const day = new Date(event.startAt);
          const dayKey = formatDayKey(day);
          const entry = {
            id: event.id,
            name: event.title,
            time: event.allDay ? calendar_all_day() : formatTime(event.startAt),
            datetime: event.startAt,
            endDatetime: event.endAt,
            source: event.source,
          };
          const existing = groups.find(
            (item) => formatDayKey(item.day) === dayKey,
          );

          if (existing) {
            existing.events.push(entry);
            return groups;
          }

          groups.push({ day, events: [entry] });
          return groups;
        }, []),
    [calendarSourceFilter, renderableEvents],
  );

  const selectedEventDetail = useMemo<CalendarEventDetail | null>(() => {
    if (!selectedEventDetailId) return null;

    const event = renderableEvents.find(
      (item) => String(item.id) === selectedEventDetailId,
    );
    if (!event) return null;

    if (event.source === "task" && String(event.id).startsWith("task-")) {
      const taskId = String(event.id).replace(/^task-/, "");
      const task = boardTasks.find((item) => item.id === taskId);
      return {
        event,
        task,
      };
    }

    const calendar = localCalendars.find(
      (item) => item.id === event.calendarId,
    );
    return {
      event,
      calendar,
    };
  }, [boardTasks, localCalendars, renderableEvents, selectedEventDetailId]);

  const loadPlannerStore = useCallback(async () => {
    try {
      setLocalStore(await api.getPlannerStore());
    } catch (error) {
      console.error(
        error instanceof Error
          ? error.message
          : calendar_failed_load_integrations(),
      );
    }
  }, []);

  useEffect(() => {
    void loadPlannerStore();
  }, [loadPlannerStore]);

  useEffect(() => {
    const collapseTimer = collapseTimerRef;
    return () => {
      if (collapseTimer.current !== null) {
        window.clearTimeout(collapseTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sidebarCollapsed) {
      setShowExpandedContent(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowExpandedContent(true);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (localCalendars.length === 0) {
      return;
    }

    setSelectedSidebarItem((current) =>
      current.startsWith("local") ? current : "local-overview",
    );
  }, [localCalendars.length, setSelectedSidebarItem]);

  useEffect(() => {
    const selectedDay = eventsByDay.get(selectedLocalDate);
    if (selectedDay && selectedDay.length > 0) {
      return;
    }

    const dayKeys = Array.from(eventsByDay.keys());
    const nextAvailableDay = dayKeys.length > 0 ? dayKeys.reduce((a, b) => a < b ? a : b) : undefined;
    if (nextAvailableDay !== undefined) {
      setSelectedLocalDate(nextAvailableDay);
    }
  }, [eventsByDay, selectedLocalDate, setSelectedLocalDate]);

  const handleCalendarSelectDay = useCallback((day: Date) => {
    setSelectedLocalDate(formatDayKey(day));
    setVisibleMonth(startOfMonth(day));
  }, [setSelectedLocalDate, setVisibleMonth]);

  const handleCalendarMonthChange = useCallback(
    (day: Date) => {
      const nextMonth = startOfMonth(day);
      setVisibleMonth(nextMonth);
      setSelectedLocalDate((current) => {
        const currentDate = parseDayKey(current);
        if (calendarViewMode !== "month") {
          return formatDayKey(day);
        }
        return currentDate.getMonth() === nextMonth.getMonth() &&
          currentDate.getFullYear() === nextMonth.getFullYear()
          ? current
          : formatDayKey(nextMonth);
      });
    },
    [calendarViewMode, setVisibleMonth, setSelectedLocalDate],
  );

  const updateBoardTask = useBoardStore((state) => state.updateTask);

  const handleCreateCalendarSlot = useCallback(
    (start: Date, end: Date) => {
      const defaultCalendarId =
        activeLocalCalendarIds[0] ?? localCalendars[0]?.id ?? "";
      if (!defaultCalendarId) {
        return;
      }

      setSelectedLocalDate(formatDayKey(start));
      setVisibleMonth(startOfMonth(start));
      setLocalEventForm({
        id: null,
        calendarId: defaultCalendarId,
        title: "",
        description: "",
        location: "",
        startAt: toDateTimeLocalValue(start),
        endAt: toDateTimeLocalValue(end),
        allDay: false,
      });
      setIsLocalEventDialogOpen(true);
    },
    [activeLocalCalendarIds, localCalendars, setLocalEventForm, setIsLocalEventDialogOpen],
  );

  const handleUpdateTaskEvent = useCallback(
    (eventId: string, updates: { start: Date; end: Date }) => {
      const taskId = eventId.replace(/^task-/, "");
      updateBoardTask(taskId, {
        dueDate: formatDayKey(updates.start),
      });
    },
    [updateBoardTask],
  );

  const handleCycleTaskStatus = useCallback(
    (eventId: string) => {
      const taskId = eventId.replace(/^task-/, "");
      const task = boardTasks.find((item) => item.id === taskId);
      if (!task) return;

      const order = ["planning", "in_progress", "review", "completed"] as const;
      const nextColumn = order[(order.indexOf(task.column) + 1) % order.length];
      updateBoardTask(taskId, { column: nextColumn });
    },
    [boardTasks, updateBoardTask],
  );

  const toggleCalendarVisibility = useCallback((calendarId: string) => {
    setHiddenCalendarIds((current) =>
      current.includes(calendarId)
        ? current.filter((id) => id !== calendarId)
        : [...current, calendarId],
    );
  }, []);

  const openEventDetail = useCallback(
    (eventId: string) => {
      setSelectedEventDetailId(eventId);
      const event = renderableEvents.find(
        (item) => String(item.id) === eventId,
      );
      if (!event) return;

      const date = new Date(event.startAt);
      setSelectedLocalDate(formatDayKey(date));
      setVisibleMonth(startOfMonth(date));
    },
    [renderableEvents, setSelectedLocalDate, setVisibleMonth],
  );

  const handleOpenCalendarEvent = useCallback(
    (event: FullScreenCalendarDay["events"][number]) => {
      openEventDetail(String(event.id));
    },
    [openEventDetail],
  );

  const handleCloseEventDetail = useCallback(() => {
    setSelectedEventDetailId(null);
  }, []);

  const handleEditSelectedEvent = useCallback(() => {
    if (!selectedEventDetail || selectedEventDetail.event.source === "task")
      return;
    openLocalEventDialog(
      formatDayKey(new Date(selectedEventDetail.event.startAt)),
      selectedEventDetail.event,
    );
  }, [selectedEventDetail, openLocalEventDialog]);

  const handleMoveSelectedTaskDate = useCallback(
    (days: number) => {
      if (!selectedEventDetail?.task?.dueDate) return;
      const current = parseDayKey(selectedEventDetail.task.dueDate);
      const next = new Date(current);
      next.setDate(current.getDate() + days);
      updateBoardTask(selectedEventDetail.task.id, {
        dueDate: formatDayKey(next),
      });
    },
    [selectedEventDetail, updateBoardTask],
  );

  const handleSetSelectedTaskColumn = useCallback(
    (column: BoardTaskColumnId) => {
      if (!selectedEventDetail?.task) return;
      updateBoardTask(selectedEventDetail.task.id, { column });
    },
    [selectedEventDetail, updateBoardTask],
  );

  function openLocalCalendarDialog(calendar?: LocalCalendar) {
    setLocalCalendarForm(
      calendar
        ? {
            id: calendar.id,
            groupId: calendar.groupId,
            name: calendar.name,
            color: calendar.color,
            description: calendar.description ?? "",
            icon: calendar.icon,
          }
        : {
            id: null,
            groupId: "",
            name: "",
            color: LOCAL_CALENDAR_COLORS[0],
            description: "",
            icon: "Calendar03",
          },
    );
    setIsLocalCalendarDialogOpen(true);
  }

  function openLocalEventDialog(dayKey?: string, event?: LocalCalendarEvent) {
    const defaultCalendarId =
      event?.calendarId ??
      activeLocalCalendarIds[0] ??
      localCalendars[0]?.id ??
      "";

    if (!defaultCalendarId) {
      return;
    }

    if (event) {
      setLocalEventForm({
        id: event.id,
        calendarId: event.calendarId,
        title: event.title,
        description: event.description,
        location: event.location,
        startAt: toDateTimeLocalValue(new Date(event.startAt)),
        endAt: toDateTimeLocalValue(new Date(event.endAt)),
        allDay: event.allDay,
      });
    } else {
      const targetDay = dayKey ? parseDayKey(dayKey) : new Date();
      const start = new Date(targetDay);
      start.setHours(9, 0, 0, 0);
      const end = new Date(start);
      end.setHours(10, 0, 0, 0);

      setLocalEventForm({
        id: null,
        calendarId: defaultCalendarId,
        title: "",
        description: "",
        location: "",
        startAt: toDateTimeLocalValue(start),
        endAt: toDateTimeLocalValue(end),
        allDay: false,
      });
    }

    if (dayKey) {
      setSelectedLocalDate(dayKey);
      setVisibleMonth(startOfMonth(parseDayKey(dayKey)));
    }

    setIsLocalEventDialogOpen(true);
  }

  async function handleSaveLocalCalendar() {
    const name = localCalendarForm.name.trim();

    if (!name) {
      return;
    }

    const nextStore = localCalendarForm.id
      ? await api.updatePlannerCalendar({
          id: localCalendarForm.id,
          groupId: "",
          name,
          color: localCalendarForm.color,
          description: localCalendarForm.description.trim(),
          icon: localCalendarForm.icon,
        })
      : await api.createPlannerCalendar({
          groupId: "",
          name,
          color: localCalendarForm.color,
          description: localCalendarForm.description.trim(),
          icon: localCalendarForm.icon,
        });

    setLocalStore(nextStore);
    if (!localCalendarForm.id) {
      const createdCalendar =
        nextStore.calendars[nextStore.calendars.length - 1];
      if (createdCalendar) {
        setSelectedSidebarItem(`local-calendar:${createdCalendar.id}`);
      }
    }

    setIsLocalCalendarDialogOpen(false);
  }

  async function handleSaveLocalEvent() {
    if (!localEventForm.calendarId) {
      return;
    }

    const title = localEventForm.title.trim();
    if (!title) {
      return;
    }

    const startAt = new Date(localEventForm.startAt);
    const endAt = new Date(localEventForm.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return;
    }

    if (endAt.getTime() < startAt.getTime()) {
      return;
    }

    const payload = {
      calendarId: localEventForm.calendarId,
      title,
      description: localEventForm.description.trim(),
      location: localEventForm.location.trim(),
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      allDay: localEventForm.allDay,
    };

    const nextStore = localEventForm.id
      ? await api.updatePlannerEvent({
          id: localEventForm.id,
          ...payload,
          provider: "local",
        })
      : await api.createPlannerEvent({
          ...payload,
          provider: "local",
        });

    setLocalStore(nextStore);

    setSelectedLocalDate(formatDayKey(startAt));
    setVisibleMonth(startOfMonth(startAt));
    setIsLocalEventDialogOpen(false);
  }

  function handleDeleteLocalCalendar(calendar: LocalCalendar) {
    setCalendarPendingDelete(calendar);
  }

  async function confirmDeleteLocalCalendar() {
    if (!calendarPendingDelete) return;

    const calendar = calendarPendingDelete;
    setLocalStore(await api.deletePlannerCalendar(calendar.id));
    setHiddenCalendarIds((current) =>
      current.filter((id) => id !== calendar.id),
    );
    setSelectedSidebarItem((current) =>
      current === `local-calendar:${calendar.id}` ? "local-overview" : current,
    );
    setCalendarPendingDelete(null);
  }

  const handleCollapseSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setShowExpandedContent(false);
    collapseTimerRef.current = window.setTimeout(() => {
      setSidebarCollapsed(true);
      collapseTimerRef.current = null;
    }, 180);
  }, []);

  const handleExpandSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setSidebarCollapsed(false);
  }, []);

  const handleResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const sidebarEl = sidebarRef.current;
      if (!sidebarEl) return;
      const sidebarLeft = sidebarEl.getBoundingClientRect().left;

      setIsResizingSidebar(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      sidebarEl.style.transition = "none";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextWidth = Math.min(
          Math.max(moveEvent.clientX - sidebarLeft, 200),
          420,
        );
        setSidebarWidth(nextWidth);
      };

      const handlePointerUp = () => {
        setIsResizingSidebar(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        sidebarEl.style.transition = "";
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [setSidebarWidth, setIsResizingSidebar],
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          ref={sidebarRef}
          className={cn(
            "relative hidden min-h-0 shrink-0 flex-col bg-card transition-[width] duration-300 ease-out lg:flex",
            sidebarCollapsed
              ? "w-0 overflow-hidden"
              : "w-[var(--calendar-sidebar-width)] overflow-visible border-r",
            isResizingSidebar ? "border-r-transparent" : "border-border",
          )}
          style={
            sidebarCollapsed
              ? undefined
              : ({
                  "--calendar-sidebar-width": `${Math.min(sidebarWidth, 420)}px`,
                } as CSSProperties)
          }
        >
          <div
            className={cn(
              "border-b border-border p-2 transition-[opacity,filter] duration-300 ease-out",
              showExpandedContent
                ? "opacity-100 blur-0"
                : "pointer-events-none opacity-0 blur-[6px]",
            )}
            aria-hidden={!showExpandedContent}
          >
            <div className="flex h-10 items-center justify-between rounded-md px-2">
              <div className="text-sm font-semibold text-foreground">
                {calendar()}
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger
                    render={(props) => (
                      <Button
                        {...props}
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openLocalCalendarDialog()}
                      >
                        <HugeiconsIcon icon={Add01Icon} className="size-4" />
                      </Button>
                    )}
                  />
                  <TooltipContent side="bottom">{add()}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={(props) => (
                      <Button
                        {...props}
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="active:-translate-y-0"
                        onClick={handleCollapseSidebar}
                      >
                        <HugeiconsIcon
                          icon={ArrowLeft01Icon}
                          className="size-4"
                        />
                      </Button>
                    )}
                  />
                  <TooltipContent side="bottom">
                    {collapse_sidebar()}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "min-h-0 flex flex-1 flex-col transition-[opacity,filter] duration-300 ease-out",
              showExpandedContent
                ? "opacity-100 blur-0"
                : "pointer-events-none opacity-0 blur-[6px]",
            )}
            aria-hidden={!showExpandedContent}
          >
            {hasSidebarCalendars ? (
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-5 p-3">
                  <div className="space-y-0.5">
                    {localCalendars.length > 0 ? (
                      <div className="space-y-0.5">
                        {localCalendars.map((calendar) => {
                          const isHidden = hiddenCalendarIds.includes(
                            calendar.id,
                          );

                          return (
                            /* oxlint-disable-next-line react-doctor/prefer-tag-over-role -- nested Button inside, invalid to nest <button> */
                            <div
                              role="button"
                              tabIndex={0}
                              key={calendar.id}
                              onClick={() =>
                                setSelectedSidebarItem(
                                  `local-calendar:${calendar.id}`,
                                )
                              }
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  setSelectedSidebarItem(
                                    `local-calendar:${calendar.id}`,
                                  );
                                }
                              }}
                              className={cn(
                                "group flex w-full min-h-9 items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors text-foreground/70 hover:bg-accent/50 hover:text-foreground",
                                selectedSidebarItem ===
                                  `local-calendar:${calendar.id}` &&
                                  "bg-accent text-foreground",
                                isHidden && "opacity-45",
                              )}
                            >
                              <HugeiconsIcon
                                icon={
                                  LOCAL_CALENDAR_ICONS.find(
                                    (i) => i.name === calendar.icon,
                                  )?.component ?? Calendar03Icon
                                }
                                className="size-3.5 shrink-0"
                                style={{ color: calendar.color }}
                              />
                              <span className="min-w-0 flex-1 truncate">
                                {calendar.name}
                              </span>
                              <div className="grid items-center justify-items-center">
                                <div className="col-start-1 row-start-1 flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    tabIndex={-1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openLocalCalendarDialog(calendar);
                                    }}
                                    title={edit()}
                                  >
                                    <HugeiconsIcon
                                      icon={Edit02Icon}
                                      className="size-3.5"
                                    />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    tabIndex={-1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteLocalCalendar(calendar);
                                    }}
                                    className="hover:text-destructive"
                                    title={
                                      typeof calendar_delete_calendar ===
                                      "function"
                                        ? calendar_delete_calendar()
                                        : delete_message()
                                    }
                                  >
                                    <HugeiconsIcon
                                      icon={Delete02Icon}
                                      className="size-3.5"
                                    />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    tabIndex={-1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCalendarVisibility(calendar.id);
                                    }}
                                    title={
                                      isHidden
                                        ? "Show calendar"
                                        : "Hide calendar"
                                    }
                                  >
                                    <HugeiconsIcon
                                      icon={ViewOffSlashIcon}
                                      className={cn(
                                        "size-3.5",
                                        isHidden && "opacity-60",
                                      )}
                                    />
                                  </Button>
                                </div>
                                <span className="pointer-events-none col-start-1 row-start-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground transition-opacity group-hover:opacity-0">
                                  {
                                    localEvents.filter(
                                      (event) =>
                                        event.calendarId === calendar.id,
                                    ).length
                                  }
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <HugeiconsIcon
                          icon={Calendar03Icon}
                          className="mx-auto mb-1.5 size-5 text-muted-foreground/30"
                        />
                        <p className="text-xs text-muted-foreground">
                          {calendar_no_groups_desc()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="min-h-0 flex-1" />
            )}
          </div>

          {/* oxlint-disable-next-line react-doctor/prefer-tag-over-role -- resize handle needs child elements, hr is void */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={resize_calendar_sidebar()}
            className={cn(
              "pointer-events-none group absolute right-[-8px] top-0 z-30 h-full w-4",
              sidebarCollapsed && "hidden",
              isResizingSidebar &&
                "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-[repeating-linear-gradient(to_bottom,theme(colors.sky.500)_0_6px,transparent_6px_12px)]",
            )}
          >
            <div
              onPointerDown={handleResizeStart}
              className={cn(
                "absolute top-1/2 left-1/2 flex h-12 w-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-sm pointer-events-auto cursor-col-resize transition-[background-color,border-color,box-shadow] duration-150 ease-out group-hover:bg-muted group-hover:shadow-md",
                isResizingSidebar && "border-border bg-muted shadow-md",
              )}
            >
              <div
                className={cn(
                  "h-8 w-px rounded-full bg-border transition-[background-color] duration-150 ease-out group-hover:bg-foreground/35",
                  isResizingSidebar && "opacity-0",
                )}
              />
            </div>
          </div>
        </div>

        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          {sidebarCollapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                  <Button
                    {...props}
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 left-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-card shadow-sm active:translate-x-[calc(-50%+2px)] active:!translate-y-[-50%]"
                    onClick={handleExpandSidebar}
                  >
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                  </Button>
                )}
              />
              <TooltipContent side="right">{expand_sidebar()}</TooltipContent>
            </Tooltip>
          ) : null}
          <ScrollArea className="h-full">
            <div className="flex min-h-full w-full flex-col gap-6 p-6">
              {localCalendars.length > 0 ? (
                <section className="space-y-6">
                  <div className="rounded-3xl border border-border bg-card p-2">
                    <FullScreenCalendar
                      data={fullScreenCalendarData}
                      currentMonth={visibleMonth}
                      selectedDay={parseDayKey(selectedLocalDate)}
                      viewMode={calendarViewMode}
                      onSelectDay={handleCalendarSelectDay}
                      onCurrentMonthChange={handleCalendarMonthChange}
                      onCreateEvent={() =>
                        openLocalEventDialog(selectedLocalDate)
                      }
                      onCreateSlot={handleCreateCalendarSlot}
                      onUpdateTaskEvent={handleUpdateTaskEvent}
                      onCycleTaskStatus={handleCycleTaskStatus}
                      onOpenEvent={handleOpenCalendarEvent}
                    />
                  </div>
                </section>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <EmptyState
                    variant="subtle"
                    size="lg"
                    title={calendar_empty_workspace_title()}
                    description={calendar_empty_workspace_desc()}
                    icons={[
                      <HugeiconsIcon
                        key="l1"
                        icon={SquareArrowDataTransferHorizontalIcon}
                        className="size-6"
                      />,
                      <HugeiconsIcon
                        key="l2"
                        icon={Calendar03Icon}
                        className="size-6"
                      />,
                      <HugeiconsIcon
                        key="l3"
                        icon={Add01Icon}
                        className="size-6"
                      />,
                    ]}
                    action={{
                      label: calendar_new_calendar(),
                      icon: (
                        <HugeiconsIcon icon={Add01Icon} className="size-4" />
                      ),
                      onClick: () => openLocalCalendarDialog(),
                    }}
                    className="w-full max-w-lg"
                  />
                </div>
              )}
            </div>
          </ScrollArea>

          {selectedEventDetail ? (
            <>
              <button
                type="button"
                aria-label={close()}
                className="absolute inset-0 z-20 bg-background/20 backdrop-blur-[1px]"
                onClick={handleCloseEventDetail}
              />
              <aside className="absolute inset-y-3 right-3 z-30 flex w-[min(460px,calc(100%-24px))] flex-col rounded-[28px] border border-border/70 bg-card/96 shadow-[0_28px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium",
                          selectedEventDetail.event.source === "task"
                            ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                        )}
                      >
                        {selectedEventDetail.event.source === "task"
                          ? "Task"
                          : "Event"}
                      </span>
                      {selectedEventDetail.task ? (
                        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                          {formatBoardColumnLabel(
                            selectedEventDetail.task.column,
                          )}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-balance text-xl font-semibold text-foreground">
                      {selectedEventDetail.event.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {formatEventDateTime(selectedEventDetail.event)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleCloseEventDetail}
                  >
                    <HugeiconsIcon
                      icon={Delete02Icon}
                      className="size-4 rotate-45"
                    />
                  </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                  <div className="space-y-6">
                    {selectedEventDetail.calendar ? (
                      <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Calendar
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <span
                            className="size-3 rounded-full"
                            style={{
                              backgroundColor:
                                selectedEventDetail.calendar.color,
                            }}
                          />
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {selectedEventDetail.calendar.name}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {selectedEventDetail.event.location ? (
                      <div>
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          {calendar_location()}
                        </div>
                        <p className="mt-2 text-sm text-foreground">
                          {selectedEventDetail.event.location}
                        </p>
                      </div>
                    ) : null}

                    {selectedEventDetail.event.description ? (
                      <div>
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          {calendar_notes()}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-foreground/85">
                          {selectedEventDetail.event.description}
                        </p>
                      </div>
                    ) : null}

                    {selectedEventDetail.task ? (
                      <div className="space-y-5">
                        <div>
                          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            Status
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(
                              [
                                "planning",
                                "in_progress",
                                "review",
                                "completed",
                              ] as BoardTaskColumnId[]
                            ).map((column) => (
                              <Button
                                key={column}
                                type="button"
                                size="sm"
                                variant={
                                  selectedEventDetail.task?.column === column
                                    ? "default"
                                    : "outline"
                                }
                                onClick={() =>
                                  handleSetSelectedTaskColumn(column)
                                }
                              >
                                {formatBoardColumnLabel(column)}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            Schedule
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleMoveSelectedTaskDate(-1)}
                            >
                              -1 day
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleUpdateTaskEvent(
                                  String(selectedEventDetail.event.id),
                                  {
                                    start: offsetDateTime(
                                      selectedEventDetail.event.startAt,
                                      -30,
                                    ),
                                    end: offsetDateTime(
                                      selectedEventDetail.event.endAt,
                                      -30,
                                    ),
                                  },
                                )
                              }
                            >
                              -30m
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleUpdateTaskEvent(
                                  String(selectedEventDetail.event.id),
                                  {
                                    start: offsetDateTime(
                                      selectedEventDetail.event.startAt,
                                      30,
                                    ),
                                    end: offsetDateTime(
                                      selectedEventDetail.event.endAt,
                                      30,
                                    ),
                                  },
                                )
                              }
                            >
                              +30m
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleMoveSelectedTaskDate(1)}
                            >
                              +1 day
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                Priority
                              </div>
                              <div className="mt-2 text-sm font-medium text-foreground">
                                {selectedEventDetail.task.priority}
                              </div>
                            </div>
                            <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                              Board
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Button
                          type="button"
                          className="w-full"
                          onClick={handleEditSelectedEvent}
                        >
                          <HugeiconsIcon icon={Edit02Icon} className="size-4" />
                          {calendar_edit_event()}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </>
          ) : null}
        </div>
      </div>

      <AppDialog
        open={isLocalCalendarDialogOpen}
        onOpenChange={setIsLocalCalendarDialogOpen}
        title={
          localCalendarForm.id
            ? calendar_edit_calendar()
            : calendar_new_calendar()
        }
        description={calendar_local_calendar_desc()}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLocalCalendarDialogOpen(false)}
            >
              {cancel()}
            </Button>
            <Button type="button" onClick={handleSaveLocalCalendar}>
              {localCalendarForm.id ? save() : calendar_new_calendar()}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">
              {calendar_calendar_name()}
            </span>
            <Input
              value={localCalendarForm.name}
              onChange={(event) =>
                setLocalCalendarForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder={calendar_name_placeholder()}
            />
          </label>

          <div className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">{color()}</span>
            <ColorSelector
              colors={LOCAL_CALENDAR_COLORS}
              size="lg"
              defaultValue={localCalendarForm.color}
              onColorSelect={(color) =>
                setLocalCalendarForm((current) => ({ ...current, color }))
              }
            />
          </div>

          <div className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">
              {calendar_icon()}
            </span>
            <div className="flex flex-wrap gap-2">
              {LOCAL_CALENDAR_ICONS.map((iconEntry) => (
                <button
                  key={iconEntry.name}
                  type="button"
                  onClick={() =>
                    setLocalCalendarForm((current) => ({
                      ...current,
                      icon: iconEntry.name,
                    }))
                  }
                  className={cn(
                    "flex size-10 items-center justify-center rounded-lg border transition-[border-color,background-color,color,box-shadow]",
                    localCalendarForm.icon === iconEntry.name
                      ? "border-slate-300 bg-slate-100/80 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200"
                      : "border-border/70 bg-background text-muted-foreground hover:border-border hover:bg-accent/35 hover:text-foreground",
                  )}
                  aria-label={iconEntry.name}
                >
                  <HugeiconsIcon
                    icon={iconEntry.component}
                    className="size-5"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </AppDialog>

      <AppDialog
        open={isLocalEventDialogOpen}
        onOpenChange={setIsLocalEventDialogOpen}
        title={localEventForm.id ? calendar_edit_event() : calendar_add_event()}
        description={calendar_local_event_desc()}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLocalEventDialogOpen(false)}
            >
              {cancel()}
            </Button>
            <Button
              type="button"
              onClick={handleSaveLocalEvent}
              disabled={localCalendars.length === 0}
            >
              {localEventForm.id ? save() : calendar_add_event()}
            </Button>
          </>
        }
      >
        {localCalendars.length > 0 ? (
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">{calendar()}</span>
              <select
                value={localEventForm.calendarId}
                onChange={(event) =>
                  setLocalEventForm((current) => ({
                    ...current,
                    calendarId: event.target.value,
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition-[border-color,box-shadow] outline-none focus-visible:outline-dashed focus-visible:outline-[0.5px] focus-visible:outline-blue-500 focus-visible:outline-offset-2"
              >
                {localCalendars.map((calendar) => {
                  return (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.name}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">
                {calendar_event_title()}
              </span>
              <Input
                value={localEventForm.title}
                onChange={(event) =>
                  setLocalEventForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder={calendar_event_title_placeholder()}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">
                  {calendar_start()}
                </span>
                <Input
                  type="datetime-local"
                  value={localEventForm.startAt}
                  onChange={(event) =>
                    setLocalEventForm((current) => ({
                      ...current,
                      startAt: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">
                  {calendar_end()}
                </span>
                <Input
                  type="datetime-local"
                  value={localEventForm.endAt}
                  onChange={(event) =>
                    setLocalEventForm((current) => ({
                      ...current,
                      endAt: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-background px-4 py-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={localEventForm.allDay}
                onChange={(event) =>
                  setLocalEventForm((current) => ({
                    ...current,
                    allDay: event.target.checked,
                  }))
                }
                className="size-4 rounded border-border"
              />
              {calendar_all_day_event()}
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">
                {calendar_location()}
              </span>
              <Input
                value={localEventForm.location}
                onChange={(event) =>
                  setLocalEventForm((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
                placeholder={calendar_location_placeholder()}
              />
            </label>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
            {calendar_create_calendar_first()}
          </div>
        )}
      </AppDialog>

      <ConfirmDialog
        open={calendarPendingDelete !== null}
        title={
          typeof calendar_delete_calendar === "function"
            ? calendar_delete_calendar()
            : delete_message()
        }
        description={
          calendarPendingDelete &&
          typeof calendar_delete_calendar_confirm === "function"
            ? calendar_delete_calendar_confirm({
                name: calendarPendingDelete.name,
              })
            : delete_message()
        }
        confirmLabel={delete_message()}
        onOpenChange={(open) => {
          if (!open) setCalendarPendingDelete(null);
        }}
        onConfirm={confirmDeleteLocalCalendar}
        variant="destructive"
      />
    </div>
  );
}

function createInitialLocalCalendarStore(): LocalCalendarStore {
  return {
    groups: [],
    calendars: [],
    events: [],
    reminders: [],
  };
}

function createEmptyEventForm(): LocalEventFormState {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const later = new Date(now);
  later.setHours(now.getHours() + 1);

  return {
    id: null,
    calendarId: "",
    title: "",
    description: "",
    location: "",
    startAt: toDateTimeLocalValue(now),
    endAt: toDateTimeLocalValue(later),
    allDay: false,
  };
}

function formatDayKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDayKey(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  return new Date(year, month - 1, day);
}

function toDateTimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

const longDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

function formatLongDate(dayKey: string) {
  return longDateFormatter.format(parseDayKey(dayKey));
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function formatTime(value: string) {
  return timeFormatter.format(new Date(value));
}

function formatEventDateTime(event: CalendarRenderableEvent) {
  const start = new Date(event.startAt);

  if (event.allDay) {
    return `${formatLongDate(formatDayKey(start))} · ${calendar_all_day()}`;
  }

  return `${formatLongDate(formatDayKey(start))} · ${formatTime(event.startAt)} - ${formatTime(event.endAt)}`;
}

function formatBoardColumnLabel(column: BoardTaskColumnId) {
  if (column === "planning") return "Planning";
  if (column === "in_progress") return "In Progress";
  if (column === "review") return "Review";
  return "Completed";
}

function boardTasksToCalendarEvents(
  tasks: ReturnType<typeof useBoardStore.getState>["tasks"],
) {
  return tasks.flatMap((task) => {
    if (!task.dueDate) return [];
    const startAt = `${task.dueDate}T09:00`;
    const endAt = `${task.dueDate}T10:00`;
    return [
      {
        id: `task-${task.id}`,
        calendarId: "board-tasks",
        title: task.title,
        description: task.description ?? "",
        location: "",
        startAt,
        endAt,
        allDay: false,
        provider: "local" as const,
        source: "task" as const,
      },
    ];
  });
}

function plannerRemindersToCalendarEvents(
  reminders: PlannerReminder[],
): ReminderRenderableEvent[] {
  return reminders.flatMap((reminder) => {
    if (reminder.completed) return [];

    const nextOccurrence = getReminderNextOccurrence(reminder);
    const displayText = getReminderDisplayText(reminder);
    const range = nextOccurrence ? reminderToDateRange(nextOccurrence) : null;
    if (!range) return [];

    return [
      {
        id: `reminder-${reminder.id}`,
        calendarId: "planner-reminders",
        title: reminder.title,
        description: reminder.notes || displayText || "",
        location: "",
        startAt: range.startAt,
        endAt: range.endAt,
        allDay: false,
        provider: "local",
        source: "task",
        status: "reminder",
      },
    ];
  });
}

function reminderToDateRange(
  start: Date,
): { startAt: string; endAt: string } | null {
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 30);
  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}
