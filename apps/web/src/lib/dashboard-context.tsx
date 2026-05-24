import {
  createContext,
  use,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useReducer,
  type ReactNode,
} from "react";
import { useLocation } from "@tanstack/react-router";
import { api, type LocalAgentProfile, type ProblemSummary, type RuntimeProfile } from "@/lib/api";
import type { AgentModelFilter } from "@/components/layout/Toolbar";
import { useUIStore } from "@/lib/store";
import { useDashboardCache } from "@/lib/dashboard-cache";
import type { Project, Organization, Problem, ProblemStatus, ControlSettings } from "@/lib/types";
import { workspace as workspaceMsg } from "@/paraglide/messages";

interface DashboardState {
  runtimes: RuntimeProfile[];
  localAgents: LocalAgentProfile[];
  projects: Project[];
  organizations: Organization[];
  problems: Problem[];
  problemSummary: ProblemSummary;
}

type DashboardAction =
  | { type: "SET_ALL"; payload: Partial<DashboardState> }
  | { type: "SET_RUNTIMES"; payload: RuntimeProfile[] }
  | { type: "SET_LOCAL_AGENTS"; payload: LocalAgentProfile[] }
  | { type: "SET_PROJECTS"; payload: Project[] }
  | { type: "SET_ORGANIZATIONS"; payload: Organization[] }
  | { type: "SET_PROBLEMS"; payload: Problem[] }
  | { type: "SET_PROBLEM_SUMMARY"; payload: ProblemSummary };

const initialDashboardState: DashboardState = {
  runtimes: [],
  localAgents: [],
  projects: [],
  organizations: [],
  problems: [],
  problemSummary: {
    status: { open: 0, fixed: 0, ignored: 0, assigned: 0 },
    inbox: { all: 0, github_pr: 0, github_issue: 0, mention: 0, agent_request: 0 },
    system: { critical: 0, warning: 0, info: 0 },
  },
};

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case "SET_ALL":
      return { ...state, ...action.payload };
    case "SET_RUNTIMES":
      return { ...state, runtimes: action.payload };
    case "SET_LOCAL_AGENTS":
      return { ...state, localAgents: action.payload };
    case "SET_PROJECTS":
      return { ...state, projects: action.payload };
    case "SET_ORGANIZATIONS":
      return { ...state, organizations: action.payload };
    case "SET_PROBLEMS":
      return { ...state, problems: action.payload };
    case "SET_PROBLEM_SUMMARY":
      return { ...state, problemSummary: action.payload };
  }
}

type RefreshResults = {
  localAgents?: LocalAgentProfile[];
  runtimes?: RuntimeProfile[];
  projects?: Project[];
  settings?: ControlSettings;
  organizations?: Organization[];
  problemSummary?: ProblemSummary;
  problems?: Problem[];
};

type DashboardView =
  | "inbox"
  | "creation"
  | "bookmarks"
  | "board"
  | "calendar"
  | "mail"
  | "observability"
  | "agents";

export type DashboardUiPreviewTarget = "send-shortcut";

function getViewFromPath(pathname: string): DashboardView {
  const segment = pathname.replace("/dashboard/", "").replace("/dashboard", "");
  const validViews: DashboardView[] = [
    "inbox",
    "creation",
    "bookmarks",
    "board",
    "calendar",
    "mail",
    "observability",
    "agents",
  ];
  return validViews.includes(segment as DashboardView) ? (segment as DashboardView) : "inbox";
}

interface InboxCounts {
  all: number;
  github_pr: number;
  github_issue: number;
  mention: number;
  agent_request: number;
}

interface SystemProblemCounts {
  critical: number;
  warning: number;
  info: number;
}

interface AgentModelCounts {
  all: number;
  local: number;
  cloud: number;
}

interface DashboardContextType {
  runtimes: RuntimeProfile[];
  localAgents: LocalAgentProfile[];
  projects: Project[];
  organizations: Organization[];
  problems: Problem[];
  settings: ControlSettings | null;
  loading: boolean;

  inboxCounts: InboxCounts;
  systemProblemCounts: SystemProblemCounts;
  agentModelCounts: AgentModelCounts;

  refreshAll: () => Promise<void>;
  refreshLocalAgents: () => Promise<void>;

  handleDismiss: (problemId: string) => Promise<void>;
  handleBulkAction: (ids: string[], status: ProblemStatus) => Promise<void>;

  handleOrganizationCreate: (name: string) => Promise<void>;
  handleOrganizationRename: (orgId: string, name: string) => Promise<void>;
  handleOrganizationDelete: (orgId: string) => Promise<void>;
  showSettingsDialog: boolean;
  setShowSettingsDialog: (open: boolean) => void;
  uiPreviewTarget: DashboardUiPreviewTarget | null;
  setUiPreviewTarget: (target: DashboardUiPreviewTarget | null) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;
  agentModelFilter: AgentModelFilter;
  setAgentModelFilter: (filter: AgentModelFilter) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboard() {
  const ctx = use(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const activeView = getViewFromPath(location.pathname);

  // Persisted state from zustand store
  const {
    activeOrganizationId,
    setActiveOrganizationId,
    settings: persistedSettings,
    setSettings,
  } = useUIStore();

  const initialCacheRef = useRef(useDashboardCache.getState());
  const initialCache = initialCacheRef.current;

  // Server data (hydrated from cache, then refreshed from API) — batched via useReducer
  const [state, dispatch] = useReducer(dashboardReducer, initialDashboardState, () => ({
    runtimes: initialCache.runtimes,
    localAgents: [],
    projects: initialCache.projects,
    organizations: initialCache.organizations,
    problems: initialCache.problems,
    problemSummary: initialCache.problemSummary,
  }));

  const { runtimes, localAgents, projects, organizations, problems, problemSummary } = state;

  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [uiPreviewTarget, setUiPreviewTarget] = useState<DashboardUiPreviewTarget | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const refreshQueuedRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedViewsRef = useRef<Set<DashboardView>>(new Set());
  const defaultOrganizationInFlightRef = useRef<Promise<Organization> | null>(null);
  const [loading, setLoading] = useState(() => {
    return initialCache.runtimes.length === 0 && initialCache.organizations.length === 0;
  });

  const inboxCounts = useMemo<InboxCounts>(() => {
    return {
      all: problemSummary.inbox.all,
      github_pr: problemSummary.inbox.github_pr,
      github_issue: problemSummary.inbox.github_issue,
      mention: problemSummary.inbox.mention,
      agent_request: problemSummary.inbox.agent_request,
    };
  }, [problemSummary]);

  const systemProblemCounts = useMemo<SystemProblemCounts>(
    () => ({
      critical: problemSummary.system.critical,
      warning: problemSummary.system.warning,
      info: problemSummary.system.info,
    }),
    [problemSummary],
  );

  const shouldLoadProjects =
    activeView === "creation" ||
    activeView === "bookmarks" ||
    activeView === "board" ||
    activeView === "calendar" ||
    activeView === "mail";
  const shouldLoadLocalAgents = activeView === "agents";
  const shouldLoadProblems = activeView === "inbox" || activeView === "observability";
  const agentModelCounts: AgentModelCounts = { all: 0, local: 0, cloud: 0 };

  const workspaceName = workspaceMsg();

  const ensureDefaultOrganization = useCallback(async () => {
    if (defaultOrganizationInFlightRef.current) {
      return defaultOrganizationInFlightRef.current;
    }

    const request = api.createOrganization({ name: workspaceName });
    defaultOrganizationInFlightRef.current = request;

    try {
      return await request;
    } finally {
      if (defaultOrganizationInFlightRef.current === request) {
        defaultOrganizationInFlightRef.current = null;
      }
    }
  }, [workspaceName]);

  const applyOrganizationResult = useCallback(
    (nextOrganizations: Organization[]) => {
      dispatch({ type: "SET_ORGANIZATIONS", payload: nextOrganizations });
      const currentOrgId = useUIStore.getState().activeOrganizationId;
      const hasCurrentOrganization = currentOrgId
        ? nextOrganizations.some((organization) => organization.id === currentOrgId)
        : false;

      if (nextOrganizations.length > 0 && !hasCurrentOrganization) {
        setActiveOrganizationId(nextOrganizations[0].id);
      }
    },
    [setActiveOrganizationId],
  );

  const applyRefreshResults = useCallback(
    (results: RefreshResults) => {
      const updates: Partial<DashboardState> = {};
      if (results.runtimes) updates.runtimes = results.runtimes;
      if (results.localAgents) updates.localAgents = results.localAgents;
      if (results.projects) updates.projects = results.projects;
      if (results.organizations) {
        applyOrganizationResult(results.organizations);
      }
      if (results.problemSummary) updates.problemSummary = results.problemSummary;
      if (results.problems) updates.problems = results.problems;
      if (results.settings) setSettings(results.settings);
      // Single dispatch for all state updates
      dispatch({ type: "SET_ALL", payload: updates });
      useDashboardCache.getState().hydrate(results);
    },
    [applyOrganizationResult, setSettings],
  );

  const hasCachedDashboardData = useCallback(() => {
    const cache = useDashboardCache.getState();
    return cache.runtimes.length > 0 || cache.organizations.length > 0;
  }, []);

  // Data fetching
  const executeRefreshAll = useCallback(async () => {
    const hasCache = hasCachedDashboardData();
    if (!hasCache) setLoading(true);

    const results = await Promise.allSettled([
      api.listRuntimes(),
      shouldLoadLocalAgents ? api.listLocalAgents() : Promise.resolve<LocalAgentProfile[]>([]),
      shouldLoadProjects ? api.listProjects() : Promise.resolve<Project[]>([]),
      api.getSettings(),
      api.listOrganizations(),
      api.getProblemSummary(),
      shouldLoadProblems ? api.listProblems() : Promise.resolve<Problem[]>([]),
    ]);
    const fresh: RefreshResults = {};
    if (results[0].status === "fulfilled") fresh.runtimes = results[0].value;
    if (results[1].status === "fulfilled") fresh.localAgents = results[1].value;
    if (results[2].status === "fulfilled") fresh.projects = results[2].value;
    if (results[3].status === "fulfilled") fresh.settings = results[3].value;
    if (results[4].status === "fulfilled") {
      const organizations = results[4].value;
      fresh.organizations = organizations.length > 0
        ? organizations
        : [await ensureDefaultOrganization()];
    }
    if (results[5].status === "fulfilled") fresh.problemSummary = results[5].value;
    if (results[6].status === "fulfilled") fresh.problems = results[6].value;
    for (const r of results) {
      if (r.status === "rejected") console.error("Failed to fetch data:", r.reason);
    }
    applyRefreshResults(fresh);
    setLoading(false);
  }, [
    applyRefreshResults,
    ensureDefaultOrganization,
    hasCachedDashboardData,
    shouldLoadProjects,
    shouldLoadLocalAgents,
    shouldLoadProblems,
  ]);

  const refreshLocalAgents = useCallback(async () => {
    const agents = await api.listLocalAgents();
    dispatch({ type: "SET_LOCAL_AGENTS", payload: agents });
  }, []);

  const refreshAll = useCallback(async () => {
    if (refreshInFlightRef.current) {
      refreshQueuedRef.current = true;
      return refreshInFlightRef.current;
    }

    const run = (async () => {
      try {
        await executeRefreshAll();
      } finally {
        refreshInFlightRef.current = null;

        if (refreshQueuedRef.current) {
          refreshQueuedRef.current = false;
          void refreshAll();
        }
      }
    })();

    refreshInFlightRef.current = run;
    return run;
  }, [executeRefreshAll]);

  const initializeViewData = useCallback(async () => {
    if (initializedViewsRef.current.has(activeView)) {
      return;
    }

    initializedViewsRef.current.add(activeView);

    if (
      activeView === "creation" ||
      activeView === "board" ||
      activeView === "calendar" ||
      activeView === "mail"
    ) {
      const criticalResults = await Promise.allSettled([
        api.listRuntimes(),
        shouldLoadProjects ? api.listProjects() : Promise.resolve<Project[]>([]),
        api.getSettings(),
        api.listOrganizations(),
        Promise.resolve([]),
      ]);

      if (criticalResults[0].status === "fulfilled") {
        applyRefreshResults({ runtimes: criticalResults[0].value });
      } else {
        console.error("Failed to fetch runtimes:", criticalResults[0].reason);
      }

      if (criticalResults[1].status === "fulfilled") {
        applyRefreshResults({ projects: criticalResults[1].value });
      } else {
        console.error("Failed to fetch projects:", criticalResults[1].reason);
      }

      if (criticalResults[2].status === "fulfilled") {
        applyRefreshResults({ settings: criticalResults[2].value });
      } else {
        console.error("Failed to fetch settings:", criticalResults[2].reason);
      }

      if (criticalResults[3].status === "fulfilled") {
        applyRefreshResults({ organizations: criticalResults[3].value });
      } else {
        console.error("Failed to fetch organizations:", criticalResults[3].reason);
      }

      setLoading(false);

      void Promise.allSettled([api.getProblemSummary()]).then((backgroundResults) => {
        if (backgroundResults[0].status === "fulfilled") {
          applyRefreshResults({ problemSummary: backgroundResults[0].value });
        } else {
          console.error("Failed to fetch problem summary:", backgroundResults[0].reason);
        }
      });

      return;
    }

    if (activeView === "agents") {
      const deviceResults = await Promise.allSettled([
        api.listRuntimes(),
        api.listLocalAgents(),
        api.getSettings(),
        api.listOrganizations(),
      ]);

      if (deviceResults[0].status === "fulfilled") {
        applyRefreshResults({ runtimes: deviceResults[0].value });
      }
      if (deviceResults[1].status === "fulfilled") {
        applyRefreshResults({ localAgents: deviceResults[1].value });
      }
      if (deviceResults[2].status === "fulfilled") {
        applyRefreshResults({ settings: deviceResults[2].value });
      }
      if (deviceResults[3].status === "fulfilled") {
        applyRefreshResults({ organizations: deviceResults[3].value });
      }

      setLoading(false);
      return;
    }

    // Inbox: only needs problems + summary + shared data (no projects/localAgents)
    if (activeView === "inbox") {
      const inboxResults = await Promise.allSettled([
        api.listRuntimes(),
        api.getSettings(),
        api.listOrganizations(),
        api.getProblemSummary(),
        api.listProblems(),
      ]);

      if (inboxResults[0].status === "fulfilled") {
        applyRefreshResults({ runtimes: inboxResults[0].value });
      }
      if (inboxResults[1].status === "fulfilled") {
        applyRefreshResults({ settings: inboxResults[1].value });
      }
      if (inboxResults[2].status === "fulfilled") {
        applyRefreshResults({ organizations: inboxResults[2].value });
      }
      if (inboxResults[3].status === "fulfilled") {
        applyRefreshResults({ problemSummary: inboxResults[3].value });
      }
      if (inboxResults[4].status === "fulfilled") {
        applyRefreshResults({ problems: inboxResults[4].value });
      }

      setLoading(false);
      return;
    }

    // Bookmarks: only needs projects + shared data (no problems/localAgents)
    if (activeView === "bookmarks") {
      const bookmarkResults = await Promise.allSettled([
        api.listRuntimes(),
        api.listProjects(),
        api.getSettings(),
        api.listOrganizations(),
      ]);

      if (bookmarkResults[0].status === "fulfilled") {
        applyRefreshResults({ runtimes: bookmarkResults[0].value });
      }
      if (bookmarkResults[1].status === "fulfilled") {
        applyRefreshResults({ projects: bookmarkResults[1].value });
      }
      if (bookmarkResults[2].status === "fulfilled") {
        applyRefreshResults({ settings: bookmarkResults[2].value });
      }
      if (bookmarkResults[3].status === "fulfilled") {
        applyRefreshResults({ organizations: bookmarkResults[3].value });
      }

      setLoading(false);
      return;
    }

    // Observability: needs problems + summary + shared data
    if (activeView === "observability") {
      const obsResults = await Promise.allSettled([
        api.listRuntimes(),
        api.getSettings(),
        api.listOrganizations(),
        api.getProblemSummary(),
        api.listProblems(),
      ]);

      if (obsResults[0].status === "fulfilled") {
        applyRefreshResults({ runtimes: obsResults[0].value });
      }
      if (obsResults[1].status === "fulfilled") {
        applyRefreshResults({ settings: obsResults[1].value });
      }
      if (obsResults[2].status === "fulfilled") {
        applyRefreshResults({ organizations: obsResults[2].value });
      }
      if (obsResults[3].status === "fulfilled") {
        applyRefreshResults({ problemSummary: obsResults[3].value });
      }
      if (obsResults[4].status === "fulfilled") {
        applyRefreshResults({ problems: obsResults[4].value });
      }

      setLoading(false);
      return;
    }

    await refreshAll();
  }, [activeView, applyRefreshResults, refreshAll, shouldLoadProjects, shouldLoadProblems]);

  useEffect(() => {
    void initializeViewData();
  }, [initializeViewData]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  // Problem actions
  const handleDismiss = useCallback(
    async (problemId: string) => {
      try {
        await api.updateProblem(problemId, { status: "ignored" });
        await refreshAll();
      } catch (err) {
        console.error("Dismiss failed:", err);
      }
    },
    [refreshAll],
  );

  const handleBulkAction = useCallback(
    async (ids: string[], status: ProblemStatus) => {
      try {
        await api.bulkUpdateProblems(ids, status);
        await refreshAll();
      } catch (err) {
        console.error("Bulk action failed:", err);
      }
    },
    [refreshAll],
  );

  // Organization actions
  const handleOrganizationCreate = useCallback(
    async (name: string) => {
      try {
        const created = await api.createOrganization({ name });
        setActiveOrganizationId(created.id);
        await refreshAll();
      } catch (err) {
        console.error("Failed to create organization:", err);
      }
    },
    [refreshAll, setActiveOrganizationId],
  );

  const handleOrganizationRename = useCallback(
    async (orgId: string, name: string) => {
      try {
        await api.updateOrganization(orgId, { name });
        await refreshAll();
      } catch (err) {
        console.error("Failed to rename organization:", err);
      }
    },
    [refreshAll],
  );

  const handleOrganizationDelete = useCallback(
    async (orgId: string) => {
      try {
        await api.deleteOrganization(orgId);
        if (activeOrganizationId === orgId) {
          const remaining = organizations.filter((o) => o.id !== orgId);
          setActiveOrganizationId(remaining.length > 0 ? remaining[0].id : null);
        }
        await refreshAll();
      } catch (err) {
        console.error("Failed to delete organization:", err);
      }
    },
    [activeOrganizationId, organizations, refreshAll, setActiveOrganizationId],
  );

  const value: DashboardContextType = {
    runtimes,
    localAgents,
    projects,
    organizations,
    problems,
    settings: persistedSettings,
    loading,
    inboxCounts,
    systemProblemCounts,
    agentModelCounts,
    refreshAll,
    refreshLocalAgents,
    handleDismiss,
    handleBulkAction,
    handleOrganizationCreate,
    handleOrganizationRename,
    handleOrganizationDelete,
    showSettingsDialog,
    setShowSettingsDialog,
    uiPreviewTarget,
    setUiPreviewTarget,
    searchQuery,
    setSearchQuery,
    agentModelFilter: "all",
    setAgentModelFilter: () => {},
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}
