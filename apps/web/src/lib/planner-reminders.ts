export type PlannerReminderSchedule =
  | {
      kind: "once";
      at: string;
    }
  | {
      kind: "daily";
      hour: number;
      minute: number;
      timezone?: string;
    };

export interface PlannerReminderLike {
  remindAt?: string;
  schedule?: PlannerReminderSchedule;
}

interface ReminderDateFormatOptions {
  locale?: string;
  timezone?: string;
}

interface ParseReminderScheduleOptions {
  now?: Date;
  normalizeStaleYear?: boolean;
}

export function parseReminderSchedule(
  input: string,
  options?: ParseReminderScheduleOptions,
): PlannerReminderSchedule | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const everyDayMatch = trimmed.match(/^每天\s+(\d{1,2}):(\d{2})$/);
  if (everyDayMatch) {
    const [, hourText, minuteText] = everyDayMatch;
    return {
      kind: "daily",
      hour: Number(hourText),
      minute: Number(minuteText),
    };
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  const normalized = options?.normalizeStaleYear
    ? normalizeStaleYear(parsed, options.now ?? new Date())
    : parsed;

  return {
    kind: "once",
    at: normalized.toISOString(),
  };
}

export function normalizeReminderInput(
  input: string | undefined,
  options?: Omit<ParseReminderScheduleOptions, "normalizeStaleYear">,
): { remindAt?: string; schedule?: PlannerReminderSchedule } {
  const trimmed = input?.trim();
  if (!trimmed) return {};

  const schedule = parseReminderSchedule(trimmed, {
    ...options,
    normalizeStaleYear: true,
  });

  return {
    remindAt: schedule?.kind === "once" ? schedule.at : trimmed,
    schedule,
  };
}

export function getReminderSchedule(reminder: PlannerReminderLike): PlannerReminderSchedule | undefined {
  return reminder.schedule ?? (reminder.remindAt ? parseReminderSchedule(reminder.remindAt) : undefined);
}

export function getReminderDisplayText(
  reminder: PlannerReminderLike,
  options?: ReminderDateFormatOptions,
): string | undefined {
  if (reminder.schedule) {
    if (reminder.schedule.kind === "daily") {
      return `每天 ${String(reminder.schedule.hour).padStart(2, "0")}:${String(reminder.schedule.minute).padStart(2, "0")}`;
    }

    return formatScheduleDate(reminder.schedule.at, options);
  }

  return reminder.remindAt?.trim() || undefined;
}

export function getReminderNextOccurrence(reminder: PlannerReminderLike): Date | null {
  const schedule = getReminderSchedule(reminder);
  if (!schedule) return null;

  if (schedule.kind === "daily") {
    const next = new Date();
    next.setHours(schedule.hour, schedule.minute, 0, 0);
    if (next.getTime() < Date.now()) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  const at = new Date(schedule.at);
  return Number.isNaN(at.getTime()) ? null : at;
}

function formatScheduleDate(value: string, options?: ReminderDateFormatOptions) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat(options?.locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: options?.timezone,
  }).format(parsed);
}

function normalizeStaleYear(parsed: Date, now: Date) {
  const parsedYear = parsed.getFullYear();
  const currentYear = now.getFullYear();
  if (parsedYear >= currentYear) return parsed;

  const normalized = new Date(parsed.getTime());
  normalized.setFullYear(currentYear);
  if (normalized.getTime() < now.getTime()) {
    normalized.setFullYear(currentYear + 1);
  }
  return normalized;
}
