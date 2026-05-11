export type Status = "success" | "failed" | "error" | "pending" | "running" | "warning";

export type Action = "write_code" | "run_tests" | "fix_bug" | "commit" | "review";

export type EventType =
  | "test_failed"
  | "review_rejected"
  | "build_success"
  | "state_changed"
  | "goal_created"
  | "goal_completed"
  | "agent_action"
  | "command_sent";

export type CommandStatus = "sent" | "executing" | "completed" | "failed";

export interface Command {
  id: string;
  instruction: string;
  agentNames: string[];
  projectIds: string[];
  goalId: string | null;
  status: CommandStatus;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  successCriteria: string[];
  constraints: string[];
  status: "active" | "completed" | "paused";
  projectId?: string;
  commandId?: string;
  watchers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  repositoryUrl?: string;
  createdAt: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  capabilities: Action[];
  status: "idle" | "active" | "error";
  model: string;
  enabled: boolean;
  cliCommand?: string;
  currentModel?: string;
  runtimeId?: string;
  avatarUrl?: string;
}

export interface RuntimeProfile {
  id: string;
  name: string;
  command: string;
  version?: string;
  path?: string;
  role: string;
  capabilities: Action[];
  model: string;
  enabled: boolean;
  currentModel?: string;
  status: "idle" | "active" | "error";
  registryId?: string;
}

export interface StateEntry {
  id: string;
  goalId: string;
  label: string;
  status: Status;
  actions?: string[];
  updatedAt: string;
}

export interface Artifact {
  id: string;
  goalId: string;
  name: string;
  type: "file" | "pr" | "test" | "log";
  status: Status;
  detail?: string;
  updatedAt: string;
  downloadUrl?: string;
}

export interface ActivityEntry {
  id: string;
  goalId: string;
  timestamp: string;
  agent: string;
  action: string;
  detail?: string;
  reasoning?: string;
  diff?: string;
}

export interface Event {
  id: string;
  type: EventType;
  goalId?: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface ControlSettings {
  autoCommit: boolean;
  autoFix: boolean;
  modelStrategy: "local-first" | "cloud-first" | "adaptive";
  locale: string;
  showShortcutHints: boolean;
  sendShortcut: "enter" | "cmd-enter";
  useMixedScript: boolean;
  preferKanji: boolean;
}

export interface McpServerProfile {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  enabled: boolean;
  scope: "global" | "project";
  projectId?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillProfile {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  scope: "global" | "project";
  projectId?: string;
  organizationId?: string;
  sourceType: "manual" | "repository";
  sourceUrl?: string;
  installPath?: string;
  manifestPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillRepositoryCandidate {
  name: string;
  description?: string;
  relativePath: string;
}

export interface SkillRepositoryAnalysis {
  analysisId: string;
  source: string;
  riskLevel: "low" | "medium" | "high";
  safeToInstall: boolean;
  summary: string;
  warnings: string[];
  installTarget: string;
  installableSkills: SkillRepositoryCandidate[];
}

export interface CreateGoalRequest {
  title: string;
  description?: string;
  successCriteria: string[];
  constraints?: string[];
  projectId?: string;
  commandId?: string;
  watchers?: string[];
}

export interface CreateCommandRequest {
  instruction: string;
  agentNames?: string[];
  projectIds?: string[];
}

export interface SandboxInstance {
  id: string;
  projectId: string;
  agentType: string;
  status: "creating" | "running" | "disposed" | "error";
  createdAt: string;
}

export interface SandboxSession {
  sessionId: string;
  vmId: string;
  agentType: string;
  status: "active" | "closed";
  createdAt: string;
}

export interface TriggerActionRequest {
  action: Action;
  stateId?: string;
  agentId?: string;
}
