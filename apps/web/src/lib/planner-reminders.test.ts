import { describe, expect, it } from "vitest";

import {
  normalizeReminderInput,
  parseReminderSchedule,
} from "./planner-reminders";

describe("planner reminders", () => {
  it("keeps default date parsing unchanged", () => {
    expect(parseReminderSchedule("2025-05-29T09:00:00.000Z")).toEqual({
      kind: "once",
      at: "2025-05-29T09:00:00.000Z",
    });
  });

  it("normalizes stale model years to the current year when still in the future", () => {
    const normalized = normalizeReminderInput("2025-05-29T09:00:00.000Z", {
      now: new Date("2026-05-28T10:00:00.000Z"),
    });

    expect(normalized).toEqual({
      remindAt: "2026-05-29T09:00:00.000Z",
      schedule: {
        kind: "once",
        at: "2026-05-29T09:00:00.000Z",
      },
    });
  });

  it("normalizes stale model years to the next future year when the current-year date has passed", () => {
    const normalized = normalizeReminderInput("2025-01-01T09:00:00.000Z", {
      now: new Date("2026-05-28T10:00:00.000Z"),
    });

    expect(normalized).toEqual({
      remindAt: "2027-01-01T09:00:00.000Z",
      schedule: {
        kind: "once",
        at: "2027-01-01T09:00:00.000Z",
      },
    });
  });

  it("keeps daily reminders human-readable", () => {
    expect(normalizeReminderInput("每天 09:30")).toEqual({
      remindAt: "每天 09:30",
      schedule: {
        kind: "daily",
        hour: 9,
        minute: 30,
      },
    });
  });
});
