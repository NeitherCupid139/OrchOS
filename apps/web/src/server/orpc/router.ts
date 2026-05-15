import { os } from "@/server/orpc/base";
import {
  bookmarksRouter,
  conversationsRouter,
  customAgentsRouter,
  filesystemRouter,
  inboxRouter,
  integrationsRouter,
  localAgentsRouter,
  observabilityRouter,
  organizationsRouter,
  plannerRouter,
  problemsRouter,
  projectsRouter,
  runtimesRouter,
  settingsRouter,
} from "@/server/orpc/routers";

export const appRouter = os.router({
  projects: projectsRouter,
  settings: settingsRouter,
  organizations: organizationsRouter,
  problems: problemsRouter,
  planner: plannerRouter,
  inbox: inboxRouter,
  bookmarks: bookmarksRouter,
  customAgents: customAgentsRouter,
  filesystem: filesystemRouter,
  conversations: conversationsRouter,
  observability: observabilityRouter,
  runtimes: runtimesRouter,
  localAgents: localAgentsRouter,
  integrations: integrationsRouter,
});
