import { os } from "@/server/orpc/base";
import { PlannerService } from "@/server/modules/planner/service";
import { getLocalDb } from "@/server/runtime/local-db";

async function getService() {
  return new PlannerService(await getLocalDb());
}

export const plannerRouter = {
  getStore: os.planner.getStore.handler(async () => {
    return (await getService()).getStore();
  }),
  createCalendar: os.planner.createCalendar.handler(async ({ input }) => {
    return (await getService()).createCalendar(input);
  }),
  updateCalendar: os.planner.updateCalendar.handler(async ({ input }) => {
    return (await getService()).updateCalendar(input);
  }),
  deleteCalendar: os.planner.deleteCalendar.handler(async ({ input }) => {
    return (await getService()).deleteCalendar(input.id);
  }),
  createEvent: os.planner.createEvent.handler(async ({ input }) => {
    return (await getService()).createEvent({
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
    return (await getService()).updateEvent(input);
  }),
  createReminder: os.planner.createReminder.handler(async ({ input }) => {
    return (await getService()).createReminder(input);
  }),
  updateReminder: os.planner.updateReminder.handler(async ({ input }) => {
    return (await getService()).updateReminder(input);
  }),
  deleteReminder: os.planner.deleteReminder.handler(async ({ input }) => {
    return (await getService()).deleteReminder(input.id);
  }),
};
