import { os } from "@/server/orpc/base";
import { PlannerService } from "@/server/modules/planner/service";
import { getLocalDb } from "@/server/runtime/local-db";
import { createServiceCache } from "@/server/service-cache";

const getService = createServiceCache((db) => new PlannerService(db));

export const plannerRouter = {
  getStore: os.planner.getStore.handler(async () => {
    return getService(await getLocalDb()).getStore();
  }),
  createCalendar: os.planner.createCalendar.handler(async ({ input }) => {
    return getService(await getLocalDb()).createCalendar(input);
  }),
  updateCalendar: os.planner.updateCalendar.handler(async ({ input }) => {
    return getService(await getLocalDb()).updateCalendar(input);
  }),
  deleteCalendar: os.planner.deleteCalendar.handler(async ({ input }) => {
    return getService(await getLocalDb()).deleteCalendar(input.id);
  }),
  createEvent: os.planner.createEvent.handler(async ({ input }) => {
    return getService(await getLocalDb()).createEvent({
      calendarId: input.calendarId,
      title: input.title,
      description: input.description ?? "",
      location: input.location ?? "",
      startAt: input.startAt,
      endAt: input.endAt,
      allDay: input.allDay,
      provider: input.provider ?? "local",
      externalId: input.externalId,
      accountId: input.accountId,
    });
  }),
  updateEvent: os.planner.updateEvent.handler(async ({ input }) => {
    return getService(await getLocalDb()).updateEvent(input);
  }),
  createReminder: os.planner.createReminder.handler(async ({ input }) => {
    return getService(await getLocalDb()).createReminder(input);
  }),
  updateReminder: os.planner.updateReminder.handler(async ({ input }) => {
    return getService(await getLocalDb()).updateReminder(input);
  }),
  deleteReminder: os.planner.deleteReminder.handler(async ({ input }) => {
    return getService(await getLocalDb()).deleteReminder(input.id);
  }),
};
