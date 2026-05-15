import type { AppDb } from "@/server/db/types";
import { IntegrationService } from "@/server/modules/integration/service";
import { PlannerService } from "@/server/modules/planner/service";
import { parseReminderSchedule } from "@/lib/planner-reminders";

type ToolResult = unknown;

export interface AgentToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export class AgentToolService {
  private integrationService: IntegrationService;
  private plannerService: PlannerService;

  constructor(db: AppDb) {
    this.integrationService = new IntegrationService(db);
    this.plannerService = new PlannerService(db);
  }

  getToolDefinitions(): AgentToolDefinition[] {
    return [
      {
        type: "function",
        function: {
          name: "create_calendar_event",
          description: "Create a calendar event in Google Calendar or the local planner store.",
          parameters: {
            type: "object",
            properties: {
              provider: { type: "string", enum: ["google", "local"] },
              calendarId: { type: "string" },
              accountId: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              location: { type: "string" },
              startAt: { type: "string" },
              endAt: { type: "string" },
              allDay: { type: "boolean" },
            },
            required: ["title", "startAt", "endAt"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_reminder",
          description: "Create a reminder in the local planner store.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              notes: { type: "string" },
              remindAt: { type: "string" },
            },
            required: ["title"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "send_email",
          description: "Send an email using Gmail integration.",
          parameters: {
            type: "object",
            properties: {
              accountId: { type: "string" },
              provider: { type: "string", enum: ["gmail", "smtp"] },
              to: {
                type: "array",
                items: { type: "string" },
              },
              cc: {
                type: "array",
                items: { type: "string" },
              },
              subject: { type: "string" },
              body: { type: "string" },
            },
            required: ["to", "subject", "body"],
          },
        },
      },
    ];
  }

  async executeTool(name: string, rawArgs: string): Promise<ToolResult> {
    let args: Record<string, unknown> = {};
    try {
      args = rawArgs ? JSON.parse(rawArgs) as Record<string, unknown> : {};
    } catch {
      throw new Error(`Invalid JSON arguments for tool ${name}`);
    }

    if (name === "create_calendar_event") {
      const provider = args.provider === "google" ? "google" : "local";
      const title = String(args.title ?? "").trim();
      const startAt = String(args.startAt ?? "").trim();
      const endAt = String(args.endAt ?? "").trim();
      if (!title || !startAt || !endAt) {
        throw new Error("title, startAt, and endAt are required");
      }

      if (provider === "google") {
        return this.integrationService.createGoogleCalendarEvent({
          title,
          description: typeof args.description === "string" ? args.description : undefined,
          location: typeof args.location === "string" ? args.location : undefined,
          startAt,
          endAt,
          allDay: args.allDay === true,
          accountId: typeof args.accountId === "string" ? args.accountId : undefined,
        });
      }

      const currentStore = await this.plannerService.getStore();
      let calendarId =
        typeof args.calendarId === "string" && args.calendarId.trim()
          ? args.calendarId.trim()
          : currentStore.calendars[0]?.id;

      if (!calendarId) {
        const nextStore = await this.plannerService.createCalendar({
          name: "Agent Calendar",
          color: "#2563eb",
          description: "Created automatically for agent-scheduled local events.",
          icon: "Calendar03",
        });
        calendarId = nextStore.calendars[0]?.id;
      }

      if (!calendarId) {
        throw new Error("No local calendar available for event creation");
      }

      const store = await this.plannerService.createEvent({
        calendarId,
        title,
        description: typeof args.description === "string" ? args.description : "",
        location: typeof args.location === "string" ? args.location : "",
        startAt,
        endAt,
        allDay: args.allDay === true,
        provider: "local",
      });

      return {
        provider: "local",
        event: store.events[store.events.length - 1] ?? null,
      };
    }

    if (name === "create_reminder") {
      const title = String(args.title ?? "").trim();
      if (!title) {
        throw new Error("title is required");
      }

      return this.plannerService.createReminder({
        title,
        notes: typeof args.notes === "string" ? args.notes : undefined,
        remindAt: typeof args.remindAt === "string" ? args.remindAt : undefined,
        schedule: typeof args.remindAt === "string" ? parseReminderSchedule(args.remindAt) : undefined,
      });
    }

    if (name === "send_email") {
      const provider = args.provider === "smtp" ? "smtp" : "gmail";
      const to = Array.isArray(args.to) ? args.to.map(String).map((item) => item.trim()).filter(Boolean) : [];
      const cc = Array.isArray(args.cc) ? args.cc.map(String).map((item) => item.trim()).filter(Boolean) : [];
      const subject = String(args.subject ?? "").trim();
      const body = String(args.body ?? "");
      if (to.length === 0 || !subject || !body.trim()) {
        throw new Error("to, subject, and body are required");
      }

      if (provider === "smtp") {
        return this.integrationService.sendSmtpMessage({
          to,
          cc,
          subject,
          body,
          accountId: typeof args.accountId === "string" ? args.accountId : undefined,
        });
      }

      return this.integrationService.sendGmailMessage({
        to,
        cc,
        subject,
        body,
        accountId: typeof args.accountId === "string" ? args.accountId : undefined,
      });
    }

    throw new Error(`Unsupported tool: ${name}`);
  }
}
