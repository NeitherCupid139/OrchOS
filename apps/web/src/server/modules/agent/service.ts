import type { AppDb } from "@/server/db/types";
import { BookmarkService } from "@/server/modules/bookmark/service";
import { IntegrationService } from "@/server/modules/integration/service";
import { PlannerService } from "@/server/modules/planner/service";
import { normalizeReminderInput } from "@/lib/planner-reminders";
import { searchWebWithDuckDuckGo } from "./duckduckgo";

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
  private db: AppDb;
  private integrationService: IntegrationService;
  private plannerService: PlannerService;

  constructor(db: AppDb) {
    this.db = db;
    this.integrationService = new IntegrationService(db);
    this.plannerService = new PlannerService(db);
  }

  getToolDefinitions(): AgentToolDefinition[] {
    return [
      {
        type: "function",
        function: {
          name: "get_current_time",
          description: "Get the current server date and time for interpreting relative calendar and reminder requests.",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      },
      {
        type: "function",
        function: {
          name: "web_search",
          description: "Search the web using DuckDuckGo for current information, recent news, and source URLs. Free, no API key required.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              timeRange: {
                type: "string",
                enum: ["d", "w", "m", "y"],
                description: "Time filter: d (past day), w (past week), m (past month), y (past year)",
              },
              maxResults: { type: "integer", description: "Number of results (1-10)" },
              excludeDomains: {
                type: "array",
                items: { type: "string" },
                description: "Domains to exclude from results",
              },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_calendar_event",
          description: "Create a calendar event in Google Calendar or the local planner store. Use ISO 8601 timestamps for startAt/endAt.",
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
          description: "Create a reminder in the local planner store. Use ISO 8601 for one-time reminders or \"每天 HH:mm\" for daily reminders.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              notes: { type: "string" },
              remindAt: { type: "string", description: "Reminder time. Use ISO 8601 for one-time reminders, or \"每天 HH:mm\" for daily reminders." },
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
      {
        type: "function",
        function: {
          name: "list_bookmarks",
          description: "List all bookmark categories and their bookmarks. Returns every category with its bookmarks (title, URL, pinned status, icon).",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_bookmark_category",
          description: "Create a new bookmark category/folder for organizing bookmarks.",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Category name (e.g. 'Development', 'Reading', 'Design')" },
              icon: { type: "string", description: "Optional icon name (e.g. 'folder', 'star', 'heart', 'book', 'code', 'tag')" },
            },
            required: ["name"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "rename_bookmark_category",
          description: "Rename a bookmark category/folder.",
          parameters: {
            type: "object",
            properties: {
              category_id: { type: "string", description: "The ID of the category to rename" },
              new_name: { type: "string", description: "The new name for the category" },
              new_icon: { type: "string", description: "Optional new icon name for the category" },
            },
            required: ["category_id", "new_name"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "delete_bookmark_category",
          description: "Delete a bookmark category and all bookmarks inside it.",
          parameters: {
            type: "object",
            properties: {
              category_id: { type: "string", description: "The ID of the category to delete" },
            },
            required: ["category_id"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_bookmark",
          description: "Add a new bookmark to a specific category.",
          parameters: {
            type: "object",
            properties: {
              category_id: { type: "string", description: "The ID of the category to add the bookmark to" },
              title: { type: "string", description: "Display title for the bookmark" },
              url: { type: "string", description: "URL of the bookmark" },
              icon: { type: "string", description: "Optional icon/emoji for the bookmark" },
            },
            required: ["category_id", "title", "url"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "rename_bookmark",
          description: "Rename or update a bookmark's title, URL, or pinned status.",
          parameters: {
            type: "object",
            properties: {
              category_id: { type: "string", description: "The ID of the category containing the bookmark" },
              bookmark_id: { type: "string", description: "The ID of the bookmark to update" },
              new_title: { type: "string", description: "Optional new display title" },
              new_url: { type: "string", description: "Optional new URL" },
            },
            required: ["category_id", "bookmark_id"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "move_bookmark",
          description: "Move a bookmark from one category to another (re-categorize a bookmark).",
          parameters: {
            type: "object",
            properties: {
              bookmark_id: { type: "string", description: "The ID of the bookmark to move" },
              source_category_id: { type: "string", description: "The current category ID of the bookmark" },
              target_category_id: { type: "string", description: "The target category ID to move the bookmark to" },
            },
            required: ["bookmark_id", "source_category_id", "target_category_id"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "delete_bookmark",
          description: "Delete a bookmark from a category.",
          parameters: {
            type: "object",
            properties: {
              category_id: { type: "string", description: "The ID of the category containing the bookmark" },
              bookmark_id: { type: "string", description: "The ID of the bookmark to delete" },
            },
            required: ["category_id", "bookmark_id"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "organize_bookmarks",
          description: "Intelligently organize bookmarks by creating, renaming, and categorizing them into groups. Provide a list of categories with their target bookmarks. Use this to auto-classify bookmarks into a new or restructured organization.",
          parameters: {
            type: "object",
            properties: {
              categories: {
                type: "array",
                description: "The complete new category structure. Each category contains a name, optional icon, and an array of bookmarks (each with title, url, and optional icon). All existing bookmarks will be replaced by this structure.",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Category name" },
                    icon: { type: "string", description: "Optional icon name for the category" },
                    bookmarks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string", description: "Bookmark title" },
                          url: { type: "string", description: "Bookmark URL" },
                          icon: { type: "string", description: "Optional bookmark icon/emoji" },
                        },
                        required: ["title", "url"],
                      },
                    },
                  },
                  required: ["name", "bookmarks"],
                },
              },
            },
            required: ["categories"],
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

    if (name === "get_current_time") {
      const now = new Date();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      return {
        iso: now.toISOString(),
        unixMs: now.getTime(),
        timezone,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        hour: now.getHours(),
        minute: now.getMinutes(),
      };
    }

    if (name === "web_search") {
      const result = await searchWebWithDuckDuckGo(fetch, {
        query: String(args.query ?? ""),
        region: args.region === "us-en" || args.region === "cn-zh" || args.region === "wt-wt"
          ? args.region
          : undefined,
        timeRange:
          args.timeRange === "d" ||
            args.timeRange === "w" ||
            args.timeRange === "m" ||
            args.timeRange === "y"
            ? args.timeRange
            : undefined,
        maxResults: typeof args.maxResults === "number" ? args.maxResults : undefined,
        excludeDomains: Array.isArray(args.excludeDomains) ? args.excludeDomains.map(String) : undefined,
      });

      if (result.error) {
        return {
          success: false,
          error: result.error,
          query: result.query,
          results: result.results,
        };
      }

      return {
        success: true,
        query: result.query,
        results: result.results,
      };
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
      const reminderTime = normalizeReminderInput(
        typeof args.remindAt === "string" ? args.remindAt : undefined,
        { now: new Date() },
      );

      return this.plannerService.createReminder({
        title,
        notes: typeof args.notes === "string" ? args.notes : undefined,
        remindAt: reminderTime.remindAt,
        schedule: reminderTime.schedule,
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

    if (name === "list_bookmarks") {
      return BookmarkService.list(this.db);
    }

    if (name === "create_bookmark_category") {
      return BookmarkService.createCategory(this.db, String(args.name ?? ""), typeof args.icon === "string" ? args.icon : undefined);
    }

    if (name === "rename_bookmark_category") {
      return BookmarkService.updateCategory(this.db, String(args.category_id ?? ""), {
        name: typeof args.new_name === "string" ? args.new_name : undefined,
        icon: typeof args.new_icon === "string" ? args.new_icon : undefined,
      });
    }

    if (name === "delete_bookmark_category") {
      return BookmarkService.deleteCategory(this.db, String(args.category_id ?? ""));
    }

    if (name === "create_bookmark") {
      return BookmarkService.createBookmark(this.db, String(args.category_id ?? ""), {
        title: String(args.title ?? ""),
        url: String(args.url ?? ""),
        icon: typeof args.icon === "string" ? args.icon : undefined,
      });
    }

    if (name === "rename_bookmark") {
      return BookmarkService.updateBookmark(this.db, String(args.category_id ?? ""), String(args.bookmark_id ?? ""), {
        title: typeof args.new_title === "string" ? args.new_title : undefined,
        url: typeof args.new_url === "string" ? args.new_url : undefined,
      });
    }

    if (name === "move_bookmark") {
      return BookmarkService.moveBookmark(
        this.db,
        String(args.bookmark_id ?? ""),
        String(args.source_category_id ?? ""),
        String(args.target_category_id ?? ""),
      );
    }

    if (name === "delete_bookmark") {
      return BookmarkService.deleteBookmark(this.db, String(args.category_id ?? ""), String(args.bookmark_id ?? ""));
    }

    if (name === "organize_bookmarks") {
      const rawCategories = Array.isArray(args.categories) ? args.categories : [];
      const categories = rawCategories.map((cat: Record<string, unknown>, index: number) => {
        const bookmarks = Array.isArray(cat.bookmarks) ? cat.bookmarks : [];
        return {
          id: `bookmark_category_${Math.random().toString(36).slice(2, 10)}_${index}`,
          name: String(cat.name ?? "Unnamed Category"),
          icon: typeof cat.icon === "string" ? cat.icon : "folder",
          bookmarks: bookmarks.map((bm: Record<string, unknown>, bmIndex: number) => ({
            id: `bookmark_${Math.random().toString(36).slice(2, 10)}_${bmIndex}`,
            title: String(bm.title ?? "Untitled"),
            url: String(bm.url ?? ""),
            pinned: false,
            icon: typeof bm.icon === "string" ? bm.icon : undefined,
          })),
        };
      });
      return BookmarkService.replaceAll(this.db, categories);
    }

    throw new Error(`Unsupported tool: ${name}`);
  }
}
