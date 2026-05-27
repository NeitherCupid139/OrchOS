import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ControlSettings } from "@/lib/types";
import type { BoardTaskFilter } from "@/components/panels/BoardView";
import type { ThemeMode } from "@/lib/theme";
import { migrateUIStore } from "@/lib/ui-store-migrations";

// SSR-safe storage: returns undefined when localStorage is unavailable (e.g. Cloudflare Workers)
const ssrSafeStorage = {
  getItem: (name: string) => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(name);
  },
  setItem: (name: string, value: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(name, value);
  },
  removeItem: (name: string) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(name);
  },
};

type SourceFilter =
  | "all"
  | "github_pr"
  | "github_issue"
  | "mention"
  | "agent_request";
type InboxStatusFilter = "all" | "open" | "assigned" | "fixed" | "ignored";
type ScopeFilter = "all" | "global" | "project";
type CreationArchiveFilter = "all" | "active" | "archived";
type MailFolderFilter =
  | "all"
  | "unread"
  | "waiting_reply"
  | "completed"
  | "archived";
type CalendarViewMode = "day" | "week" | "month";
type CapabilityViewMode = "mine" | "market";
interface UIState {
  // Navigation & selection
  activeInboxId: string | null;
  activeOrganizationId: string | null;

  // Filters
  sourceFilter: SourceFilter;
  inboxStatusFilter: InboxStatusFilter;
  scopeFilter: ScopeFilter;
  creationArchiveFilter: CreationArchiveFilter;
  mailFolderFilter: MailFolderFilter;
  calendarViewMode: CalendarViewMode;
  capabilityViewMode: CapabilityViewMode;
  boardFilter: BoardTaskFilter;

  // Panel states
  activityPanelOpen: boolean;
  activityExpanded: boolean;
  sidebarCollapsed: boolean;
  creationSidebarCollapsed: boolean;
  creationSidebarWidth: number;
  sidebarWidth: number;

  // Theme
  theme: ThemeMode;
  themePreferenceSet: boolean;

  // Settings (persisted locally, also synced with server)
  settings: ControlSettings | null;
}

interface UIActions {
  setActiveInboxId: (id: string | null) => void;
  setActiveOrganizationId: (id: string | null) => void;
  setSourceFilter: (filter: SourceFilter) => void;
  setInboxStatusFilter: (filter: InboxStatusFilter) => void;
  setScopeFilter: (filter: ScopeFilter) => void;
  setCreationArchiveFilter: (filter: CreationArchiveFilter) => void;
  setMailFolderFilter: (filter: MailFolderFilter) => void;
  setCalendarViewMode: (mode: CalendarViewMode) => void;
  setCapabilityViewMode: (mode: CapabilityViewMode) => void;
  setBoardFilter: (filter: BoardTaskFilter) => void;
  setActivityPanelOpen: (open: boolean) => void;
  toggleActivityPanel: () => void;
  setActivityExpanded: (expanded: boolean) => void;
  toggleActivityExpanded: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setCreationSidebarCollapsed: (collapsed: boolean) => void;
  toggleCreationSidebar: () => void;
  setCreationSidebarWidth: (width: number) => void;
  setSidebarWidth: (width: number) => void;
  setTheme: (mode: ThemeMode) => void;
  setSettings: (settings: ControlSettings) => void;
}

const defaultSettings: ControlSettings = {
  autoCommit: false,
  autoFix: false,
  modelStrategy: "adaptive",
  locale: "en",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  projectChatsRequireSandbox: true,
  showShortcutHints: false,
  sendShortcut: "enter" as const,
  useMixedScript: false,
  preferKanji: false,
  notifications: {
    system: true,
    sound: true,
    eventSounds: {},
    eventSoundFiles: {},
  },
};

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      // Navigation & selection
      activeInboxId: null,
      activeOrganizationId: null,

      // Filters
      sourceFilter: "all" as SourceFilter,
      inboxStatusFilter: "all" as InboxStatusFilter,
      scopeFilter: "all" as ScopeFilter,
      creationArchiveFilter: "all" as CreationArchiveFilter,
      mailFolderFilter: "all" as MailFolderFilter,
      calendarViewMode: "week" as CalendarViewMode,
      capabilityViewMode: "mine" as CapabilityViewMode,
      boardFilter: "all" as BoardTaskFilter,

      // Panel states
      activityPanelOpen: false,
      activityExpanded: false,
      sidebarCollapsed: false,
      creationSidebarCollapsed: false,
      creationSidebarWidth: 280,
      sidebarWidth: 280,

      // Theme
      theme: "auto" as ThemeMode,
      themePreferenceSet: false,

      // Settings
      settings: defaultSettings,

      setActiveInboxId: (id) => set({ activeInboxId: id }),
      setActiveOrganizationId: (id) => set({ activeOrganizationId: id }),
      setSourceFilter: (filter) => set({ sourceFilter: filter }),
      setInboxStatusFilter: (filter) => set({ inboxStatusFilter: filter }),
      setScopeFilter: (filter) => set({ scopeFilter: filter }),
      setCreationArchiveFilter: (filter) =>
        set({ creationArchiveFilter: filter }),
      setMailFolderFilter: (filter) => set({ mailFolderFilter: filter }),
      setCalendarViewMode: (mode) => set({ calendarViewMode: mode }),
      setCapabilityViewMode: (mode) => set({ capabilityViewMode: mode }),
      setBoardFilter: (filter) => set({ boardFilter: filter }),
      setActivityPanelOpen: (open) => set({ activityPanelOpen: open }),
      toggleActivityPanel: () =>
        set((s) => ({ activityPanelOpen: !s.activityPanelOpen })),
      setActivityExpanded: (expanded) => set({ activityExpanded: expanded }),
      toggleActivityExpanded: () =>
        set((s) => ({ activityExpanded: !s.activityExpanded })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCreationSidebarCollapsed: (collapsed) =>
        set({ creationSidebarCollapsed: collapsed }),
      toggleCreationSidebar: () =>
        set((s) => ({ creationSidebarCollapsed: !s.creationSidebarCollapsed })),
      setCreationSidebarWidth: (width) => set({ creationSidebarWidth: width }),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setTheme: (mode) => set({ theme: mode, themePreferenceSet: true }),
      setSettings: (settings) => set({ settings }),
    }),
    {
      name: "orchos-ui",
      version: 2,
      storage: createJSONStorage(() => ssrSafeStorage),
      migrate: migrateUIStore,
      // Only persist essential navigation/filter state — settings come from server API.
      partialize: (state) => ({
        activeOrganizationId: state.activeOrganizationId,
        sourceFilter: state.sourceFilter,
        inboxStatusFilter: state.inboxStatusFilter,
        scopeFilter: state.scopeFilter,
        creationArchiveFilter: state.creationArchiveFilter,
        mailFolderFilter: state.mailFolderFilter,
        calendarViewMode: state.calendarViewMode,
        capabilityViewMode: state.capabilityViewMode,
        boardFilter: state.boardFilter,
        sidebarCollapsed: state.sidebarCollapsed,
        creationSidebarCollapsed: state.creationSidebarCollapsed,
        creationSidebarWidth: state.creationSidebarWidth,
        sidebarWidth: state.sidebarWidth,
        theme: state.theme,
        themePreferenceSet: state.themePreferenceSet,
      }),
    },
  ),
);
