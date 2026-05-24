import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Goal,
  AgentProfile,
  Project,
  Organization,
  Problem,
  Rule,
  Command,
  ControlSettings,
} from "@/lib/types";
import type {
  RuntimeProfile,
  McpServerProfile,
  SkillProfile,
  ProblemSummary,
} from "@/lib/api";

interface DashboardCacheState {
  goals: Goal[];
  agents: AgentProfile[];
  runtimes: RuntimeProfile[];
  projects: Project[];
  organizations: Organization[];
  problems: Problem[];
  problemSummary: ProblemSummary;
  rules: Rule[];
  commands: Command[];
  mcpServers: McpServerProfile[];
  skills: SkillProfile[];
  settings: ControlSettings | null;
}

interface DashboardCacheActions {
  hydrate: (data: Partial<DashboardCacheState>) => void;
  clear: () => void;
}

const emptySummary: ProblemSummary = {
  status: { open: 0, fixed: 0, ignored: 0, assigned: 0 },
  inbox: { all: 0, github_pr: 0, github_issue: 0, mention: 0, agent_request: 0 },
  system: { critical: 0, warning: 0, info: 0 },
};

const initialState: DashboardCacheState = {
  goals: [],
  agents: [],
  runtimes: [],
  projects: [],
  organizations: [],
  problems: [],
  problemSummary: emptySummary,
  rules: [],
  commands: [],
  mcpServers: [],
  skills: [],
  settings: null,
};

export const useDashboardCache = create<DashboardCacheState & DashboardCacheActions>()(
  persist(
    (set) => ({
      ...initialState,
      hydrate: (data) => set((s) => ({ ...s, ...data })),
      clear: () => set(initialState),
    }),
    {
      name: "orchos-dashboard-cache",
      version: 2,
      /**
       * Only persist essential data for fast initial render.
       * Large/frequently-changing collections (problems, mcpServers, etc.)
       * are fetched fresh on each visit — persisting them causes unnecessary
       * localStorage writes on every dashboard refresh.
       */
      partialize: (state) => ({
        runtimes: state.runtimes,
        organizations: state.organizations,
        projects: state.projects,
        problemSummary: state.problemSummary,
        settings: state.settings,
      }),
    },
  ),
);
