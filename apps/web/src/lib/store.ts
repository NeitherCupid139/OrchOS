import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ControlSettings, SidebarView } from "@/lib/types";
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
export type MailFolderFilter =
  | "inbox"
  | "drafts"
  | "sent"
  | "spam"
  | "trash"
  | "archived";
type CalendarViewMode = "day" | "week" | "month";
type CalendarSourceFilter = "all" | "events" | "tasks";
type CapabilityViewMode = "mine" | "market";
type ChatInputMode = "chat" | "search";
type ObservabilityTimeRange = "24h" | "7d" | "30d";
type SettingsDialogTab =
  | "general"
  | "notifications"
  | "mail"
  | "data"
  | "shortcuts"
  | "about";
type ProfileDialogTab = "profile" | "security" | "membership";
type SetterValue<T> = T | ((current: T) => T);

function resolveSetterValue<T>(value: SetterValue<T>, current: T) {
  return typeof value === "function"
    ? (value as (current: T) => T)(current)
    : value;
}

function formatLocalDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface UIState {
  // Navigation & selection
  activeInboxId: string | null;
  activeOrganizationId: string | null;
  selectedBookmarkCategoryId: string | null;
  mailActiveAccountId: string | null;
  calendarActiveAccountId: string | null;
  calendarSelectedSidebarItem: string;
  calendarSelectedLocalDate: string;
  creationSelectedCustomAgentId: string | null | undefined;
  settingsDialogTab: SettingsDialogTab;
  profileDialogTab: ProfileDialogTab;

  // Filters
  sourceFilter: SourceFilter;
  inboxStatusFilter: InboxStatusFilter;
  scopeFilter: ScopeFilter;
  creationArchiveFilter: CreationArchiveFilter;
  mailFolderFilter: MailFolderFilter;
  calendarViewMode: CalendarViewMode;
  calendarSourceFilter: CalendarSourceFilter;
  capabilityViewMode: CapabilityViewMode;
  boardFilter: BoardTaskFilter;
  chatInputMode: ChatInputMode;
  chatSearchEngineId: string;
  observabilityTimeRange: ObservabilityTimeRange;

  // Panel states
  activityPanelOpen: boolean;
  activityExpanded: boolean;
  sidebarCollapsed: boolean;
  sidebarItemNotifications: Partial<Record<SidebarView, number>>;
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
  setSelectedBookmarkCategoryId: (
    id: SetterValue<string | null>,
  ) => void;
  setMailActiveAccountId: (id: string | null) => void;
  setCalendarActiveAccountId: (id: string | null) => void;
  setCalendarSelectedSidebarItem: (item: SetterValue<string>) => void;
  setCalendarSelectedLocalDate: (date: SetterValue<string>) => void;
  setCreationSelectedCustomAgentId: (id: string | null | undefined) => void;
  setSettingsDialogTab: (tab: SettingsDialogTab) => void;
  setProfileDialogTab: (tab: ProfileDialogTab) => void;
  setSourceFilter: (filter: SourceFilter) => void;
  setInboxStatusFilter: (filter: InboxStatusFilter) => void;
  setScopeFilter: (filter: ScopeFilter) => void;
  setCreationArchiveFilter: (filter: CreationArchiveFilter) => void;
  setMailFolderFilter: (filter: MailFolderFilter) => void;
  setCalendarViewMode: (mode: CalendarViewMode) => void;
  setCalendarSourceFilter: (filter: CalendarSourceFilter) => void;
  setCapabilityViewMode: (mode: CapabilityViewMode) => void;
  setBoardFilter: (filter: BoardTaskFilter) => void;
  setChatInputMode: (mode: ChatInputMode) => void;
  setChatSearchEngineId: (id: string) => void;
  setObservabilityTimeRange: (range: ObservabilityTimeRange) => void;
  setActivityPanelOpen: (open: boolean) => void;
  toggleActivityPanel: () => void;
  setActivityExpanded: (expanded: boolean) => void;
  toggleActivityExpanded: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  notifySidebarView: (view: SidebarView) => void;
  clearSidebarViewNotification: (view: SidebarView) => void;
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
      selectedBookmarkCategoryId: null,
      mailActiveAccountId: null,
      calendarActiveAccountId: null,
      calendarSelectedSidebarItem: "google-overview",
      calendarSelectedLocalDate: formatLocalDayKey(new Date()),
      creationSelectedCustomAgentId: undefined,
      settingsDialogTab: "general" as SettingsDialogTab,
      profileDialogTab: "profile" as ProfileDialogTab,

      // Filters
      sourceFilter: "all" as SourceFilter,
      inboxStatusFilter: "all" as InboxStatusFilter,
      scopeFilter: "all" as ScopeFilter,
      creationArchiveFilter: "all" as CreationArchiveFilter,
      mailFolderFilter: "inbox" as MailFolderFilter,
      calendarViewMode: "week" as CalendarViewMode,
      calendarSourceFilter: "all" as CalendarSourceFilter,
      capabilityViewMode: "mine" as CapabilityViewMode,
      boardFilter: "all" as BoardTaskFilter,
      chatInputMode: "chat" as ChatInputMode,
      chatSearchEngineId: "google",
      observabilityTimeRange: "24h" as ObservabilityTimeRange,

      // Panel states
      activityPanelOpen: false,
      activityExpanded: false,
      sidebarCollapsed: false,
      sidebarItemNotifications: {},
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
      setSelectedBookmarkCategoryId: (id) =>
        set((state) => ({
          selectedBookmarkCategoryId: resolveSetterValue(
            id,
            state.selectedBookmarkCategoryId,
          ),
        })),
      setMailActiveAccountId: (id) => set({ mailActiveAccountId: id }),
      setCalendarActiveAccountId: (id) => set({ calendarActiveAccountId: id }),
      setCalendarSelectedSidebarItem: (item) =>
        set((state) => ({
          calendarSelectedSidebarItem: resolveSetterValue(
            item,
            state.calendarSelectedSidebarItem,
          ),
        })),
      setCalendarSelectedLocalDate: (date) =>
        set((state) => ({
          calendarSelectedLocalDate: resolveSetterValue(
            date,
            state.calendarSelectedLocalDate,
          ),
        })),
      setCreationSelectedCustomAgentId: (id) =>
        set({ creationSelectedCustomAgentId: id }),
      setSettingsDialogTab: (tab) => set({ settingsDialogTab: tab }),
      setProfileDialogTab: (tab) => set({ profileDialogTab: tab }),
      setSourceFilter: (filter) => set({ sourceFilter: filter }),
      setInboxStatusFilter: (filter) => set({ inboxStatusFilter: filter }),
      setScopeFilter: (filter) => set({ scopeFilter: filter }),
      setCreationArchiveFilter: (filter) =>
        set({ creationArchiveFilter: filter }),
      setMailFolderFilter: (filter) => set({ mailFolderFilter: filter }),
      setCalendarViewMode: (mode) => set({ calendarViewMode: mode }),
      setCalendarSourceFilter: (filter) =>
        set({ calendarSourceFilter: filter }),
      setCapabilityViewMode: (mode) => set({ capabilityViewMode: mode }),
      setBoardFilter: (filter) => set({ boardFilter: filter }),
      setChatInputMode: (mode) => set({ chatInputMode: mode }),
      setChatSearchEngineId: (id) => set({ chatSearchEngineId: id }),
      setObservabilityTimeRange: (range) =>
        set({ observabilityTimeRange: range }),
      setActivityPanelOpen: (open) => set({ activityPanelOpen: open }),
      toggleActivityPanel: () =>
        set((s) => ({ activityPanelOpen: !s.activityPanelOpen })),
      setActivityExpanded: (expanded) => set({ activityExpanded: expanded }),
      toggleActivityExpanded: () =>
        set((s) => ({ activityExpanded: !s.activityExpanded })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      notifySidebarView: (view) =>
        set((state) => ({
          sidebarItemNotifications: {
            ...state.sidebarItemNotifications,
            [view]: (state.sidebarItemNotifications[view] ?? 0) + 1,
          },
        })),
      clearSidebarViewNotification: (view) =>
        set((state) => {
          if (!state.sidebarItemNotifications[view]) return {};
          const next = { ...state.sidebarItemNotifications };
          delete next[view];
          return { sidebarItemNotifications: next };
        }),
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
        selectedBookmarkCategoryId: state.selectedBookmarkCategoryId,
        mailActiveAccountId: state.mailActiveAccountId,
        calendarActiveAccountId: state.calendarActiveAccountId,
        calendarSelectedSidebarItem: state.calendarSelectedSidebarItem,
        calendarSelectedLocalDate: state.calendarSelectedLocalDate,
        creationSelectedCustomAgentId: state.creationSelectedCustomAgentId,
        settingsDialogTab: state.settingsDialogTab,
        profileDialogTab: state.profileDialogTab,
        sourceFilter: state.sourceFilter,
        inboxStatusFilter: state.inboxStatusFilter,
        scopeFilter: state.scopeFilter,
        creationArchiveFilter: state.creationArchiveFilter,
        mailFolderFilter: state.mailFolderFilter,
        calendarViewMode: state.calendarViewMode,
        calendarSourceFilter: state.calendarSourceFilter,
        capabilityViewMode: state.capabilityViewMode,
        boardFilter: state.boardFilter,
        chatInputMode: state.chatInputMode,
        chatSearchEngineId: state.chatSearchEngineId,
        observabilityTimeRange: state.observabilityTimeRange,
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
