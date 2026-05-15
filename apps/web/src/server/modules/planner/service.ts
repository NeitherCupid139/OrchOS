import { eq } from "drizzle-orm";
import { settings } from "@/server/db/schema";
import type { AppDb } from "@/server/db/types";
import { generateId } from "@/server/utils";

const PLANNER_STORAGE_KEY = "planner_store";

export interface PlannerCalendarGroup {
  id: string;
  name: string;
}

export interface PlannerCalendar {
  id: string;
  groupId: string;
  name: string;
  color: string;
  description: string;
  icon: string;
}

export interface PlannerCalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  provider: "local" | "google";
  externalId?: string;
  accountId?: string;
}

export interface PlannerReminder {
  id: string;
  title: string;
  notes: string;
  remindAt?: string;
  schedule?: {
    kind: "once";
    at: string;
  } | {
    kind: "daily";
    hour: number;
    minute: number;
    timezone?: string;
  };
  completed: boolean;
  provider: "local";
  createdAt: string;
  updatedAt: string;
}

export interface PlannerStore {
  groups: PlannerCalendarGroup[];
  calendars: PlannerCalendar[];
  events: PlannerCalendarEvent[];
  reminders: PlannerReminder[];
}

function createInitialPlannerStore(): PlannerStore {
  return {
    groups: [],
    calendars: [],
    events: [],
    reminders: [],
  };
}

export class PlannerService {
  constructor(private db: AppDb) {}

  private async loadStore(): Promise<PlannerStore> {
    const row = await this.db
      .select()
      .from(settings)
      .where(eq(settings.key, PLANNER_STORAGE_KEY))
      .get() as { key: string; value: string } | undefined;

    if (!row) {
      return createInitialPlannerStore();
    }

    try {
      const parsed = JSON.parse(row.value) as Partial<PlannerStore>;
      return {
        groups: Array.isArray(parsed.groups) ? parsed.groups : [],
        calendars: Array.isArray(parsed.calendars) ? parsed.calendars : [],
        events: Array.isArray(parsed.events) ? parsed.events : [],
        reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
      };
    } catch {
      return createInitialPlannerStore();
    }
  }

  private async saveStore(store: PlannerStore) {
    const value = JSON.stringify(store);
    await this.db
      .insert(settings)
      .values({ key: PLANNER_STORAGE_KEY, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value },
      })
      .run();
  }

  async getStore(): Promise<PlannerStore> {
    return this.loadStore();
  }

  async createCalendar(input: {
    groupId?: string;
    name: string;
    color: string;
    description?: string;
    icon: string;
  }): Promise<PlannerStore> {
    const store = await this.loadStore();
    store.calendars.push({
      id: generateId("calendar"),
      groupId: input.groupId ?? "",
      name: input.name.trim(),
      color: input.color,
      description: input.description?.trim() ?? "",
      icon: input.icon,
    });
    await this.saveStore(store);
    return store;
  }

  async updateCalendar(input: {
    id: string;
    groupId?: string;
    name?: string;
    color?: string;
    description?: string;
    icon?: string;
  }): Promise<PlannerStore> {
    const store = await this.loadStore();
    store.calendars = store.calendars.map((calendar) =>
      calendar.id === input.id
        ? {
            ...calendar,
            groupId: input.groupId ?? calendar.groupId,
            name: input.name?.trim() ?? calendar.name,
            color: input.color ?? calendar.color,
            description: input.description?.trim() ?? calendar.description,
            icon: input.icon ?? calendar.icon,
          }
        : calendar,
    );
    await this.saveStore(store);
    return store;
  }

  async deleteCalendar(id: string): Promise<PlannerStore> {
    const store = await this.loadStore();
    store.calendars = store.calendars.filter((calendar) => calendar.id !== id);
    store.events = store.events.filter((event) => event.calendarId !== id);
    await this.saveStore(store);
    return store;
  }

  async createEvent(input: Omit<PlannerCalendarEvent, "id">): Promise<PlannerStore> {
    const store = await this.loadStore();
    store.events.push({
      ...input,
      id: generateId("event"),
    });
    await this.saveStore(store);
    return store;
  }

  async updateEvent(input: Partial<PlannerCalendarEvent> & { id: string }): Promise<PlannerStore> {
    const store = await this.loadStore();
    store.events = store.events.map((event) =>
      event.id === input.id
        ? {
            ...event,
            ...input,
            title: input.title?.trim() ?? event.title,
            description: input.description?.trim() ?? event.description,
            location: input.location?.trim() ?? event.location,
          }
        : event,
    );
    await this.saveStore(store);
    return store;
  }

  async createReminder(input: {
    title: string;
    notes?: string;
    remindAt?: string;
    schedule?: PlannerReminder["schedule"];
  }): Promise<PlannerReminder> {
    const store = await this.loadStore();
    const now = new Date().toISOString();
    const reminder: PlannerReminder = {
      id: generateId("reminder"),
      title: input.title.trim(),
      notes: input.notes?.trim() ?? "",
      remindAt: input.remindAt,
      schedule: input.schedule,
      completed: false,
      provider: "local",
      createdAt: now,
      updatedAt: now,
    };
    store.reminders.push(reminder);
    await this.saveStore(store);
    return reminder;
  }

  async updateReminder(input: {
    id: string;
    title?: string;
    notes?: string;
    remindAt?: string;
    schedule?: PlannerReminder["schedule"];
    completed?: boolean;
  }): Promise<PlannerStore> {
    const store = await this.loadStore();
    const now = new Date().toISOString();

    store.reminders = store.reminders.map((reminder) =>
      reminder.id === input.id
        ? {
            ...reminder,
            title: input.title?.trim() ?? reminder.title,
            notes: input.notes !== undefined ? input.notes.trim() : reminder.notes,
            remindAt: input.remindAt !== undefined ? input.remindAt : reminder.remindAt,
            schedule: input.schedule !== undefined ? input.schedule : reminder.schedule,
            completed: input.completed ?? reminder.completed,
            updatedAt: now,
          }
        : reminder,
    );

    await this.saveStore(store);
    return store;
  }

  async deleteReminder(id: string): Promise<PlannerStore> {
    const store = await this.loadStore();
    store.reminders = store.reminders.filter((reminder) => reminder.id !== id);
    await this.saveStore(store);
    return store;
  }
}
