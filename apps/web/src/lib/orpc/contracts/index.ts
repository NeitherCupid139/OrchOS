import { bookmarksContract } from "./bookmarks";
import { conversationsContract } from "./conversations";
import { customAgentsContract } from "./custom-agents";
import { filesystemContract } from "./filesystem";
import { inboxContract } from "./inbox";
import { integrationsContract } from "./integrations";
import { localAgentsContract } from "./local-agents";
import { observabilityContract } from "./observability";
import { organizationsContract } from "./organizations";
import { problemsContract } from "./problems";
import { plannerContract } from "./planner";
import { projectsContract } from "./projects";
import { runtimesContract } from "./runtimes";
import { settingsContract } from "./settings";
import { subscriptionContract } from "./subscription";

export const appContract = {
  projects: projectsContract,
  settings: settingsContract,
  organizations: organizationsContract,
  problems: problemsContract,
  planner: plannerContract,
  inbox: inboxContract,
  bookmarks: bookmarksContract,
  customAgents: customAgentsContract,
  filesystem: filesystemContract,
  conversations: conversationsContract,
  observability: observabilityContract,
  runtimes: runtimesContract,
  localAgents: localAgentsContract,
  integrations: integrationsContract,
  subscription: subscriptionContract,
};

export type AppContract = typeof appContract;
