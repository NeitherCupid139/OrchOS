import { oc } from "@orpc/contract";
import { z } from "zod";

const plannerCalendarGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const plannerCalendarSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  name: z.string(),
  color: z.string(),
  description: z.string(),
  icon: z.string(),
});

const plannerCalendarEventSchema = z.object({
  id: z.string(),
  calendarId: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  allDay: z.boolean(),
  provider: z.enum(["local", "google"]),
  externalId: z.string().optional(),
  accountId: z.string().optional(),
});

const plannerReminderSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string(),
  remindAt: z.string().optional(),
  schedule: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("once"),
      at: z.string(),
    }),
    z.object({
      kind: z.literal("daily"),
      hour: z.number().int().min(0).max(23),
      minute: z.number().int().min(0).max(59),
      timezone: z.string().optional(),
    }),
  ]).optional(),
  completed: z.boolean(),
  provider: z.literal("local"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const plannerStoreSchema = z.object({
  groups: z.array(plannerCalendarGroupSchema),
  calendars: z.array(plannerCalendarSchema),
  events: z.array(plannerCalendarEventSchema),
  reminders: z.array(plannerReminderSchema),
});

export const plannerContract = {
  getStore: oc.input(z.object({}).optional()).output(plannerStoreSchema),
  createCalendar: oc
    .input(
      z.object({
        groupId: z.string().optional(),
        name: z.string(),
        color: z.string(),
        description: z.string().optional(),
        icon: z.string(),
      }),
    )
    .output(plannerStoreSchema),
  updateCalendar: oc
    .input(
      z.object({
        id: z.string(),
        groupId: z.string().optional(),
        name: z.string().optional(),
        color: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
      }),
    )
    .output(plannerStoreSchema),
  deleteCalendar: oc
    .input(z.object({ id: z.string() }))
    .output(plannerStoreSchema),
  createEvent: oc
    .input(
      z.object({
        calendarId: z.string(),
        title: z.string(),
        description: z.string().optional(),
        location: z.string().optional(),
        startAt: z.string(),
        endAt: z.string(),
        allDay: z.boolean(),
        provider: z.enum(["local", "google"]).optional(),
        externalId: z.string().optional(),
        accountId: z.string().optional(),
      }),
    )
    .output(plannerStoreSchema),
  updateEvent: oc
    .input(
      z.object({
        id: z.string(),
        calendarId: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        startAt: z.string().optional(),
        endAt: z.string().optional(),
        allDay: z.boolean().optional(),
        provider: z.enum(["local", "google"]).optional(),
        externalId: z.string().optional(),
        accountId: z.string().optional(),
      }),
    )
    .output(plannerStoreSchema),
  createReminder: oc
    .input(
      z.object({
        title: z.string(),
        notes: z.string().optional(),
        remindAt: z.string().optional(),
        schedule: plannerReminderSchema.shape.schedule,
      }),
    )
    .output(plannerReminderSchema),
  updateReminder: oc
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        notes: z.string().optional(),
        remindAt: z.string().optional(),
        schedule: plannerReminderSchema.shape.schedule,
        completed: z.boolean().optional(),
      }),
    )
    .output(plannerStoreSchema),
  deleteReminder: oc
    .input(z.object({ id: z.string() }))
    .output(plannerStoreSchema),
};
