export type Status = "success" | "failed" | "error" | "pending" | "running" | "warning";

export type Action = "write_code" | "run_tests" | "fix_bug" | "commit" | "review";

export type ProblemPriority = "critical" | "warning" | "info";
export type ProblemStatus = "open" | "fixed" | "ignored" | "assigned";

export type InboxSource = "github_pr" | "github_issue" | "mention" | "agent_request";
export type SystemProblemSource =
  | "test_failed"
  | "build_error"
  | "lint_error"
  | "lint_warning"
  | "review_rejected";

export const INBOX_SOURCES: InboxSource[] = [
  "github_pr",
  "github_issue",
  "mention",
  "agent_request",
];
export const SYSTEM_SOURCES: SystemProblemSource[] = [
  "test_failed",
  "build_error",
  "lint_error",
  "lint_warning",
  "review_rejected",
];

export const inboxSourceLabels: Record<InboxSource, string> = {
  github_pr: "Pull Request",
  github_issue: "Issue",
  mention: "Mention",
  agent_request: "Agent Request",
};

export interface Project {
  id: string;
  name: string;
  path: string;
  repositoryUrl?: string;
  createdAt?: string;
}

export interface ProjectPreviewStatus {
  projectId: string;
  running: boolean;
  command?: string;
  url?: string;
  port?: number;
  pid?: number;
  startedAt?: string;
  logs?: string;
  error?: string;
}

export interface ProjectGitBranchInfo {
  name: string;
  current: boolean;
}

export interface ProjectGitStatus {
  projectId: string;
  branch: string;
  branches: ProjectGitBranchInfo[];
  modified: string[];
  staged: string[];
  untracked: string[];
  isGitRepo: boolean;
  error?: string;
}

export interface ProjectCommitActivityDay {
  date: string;
  count: number;
  level: number;
}

export interface ProjectCommitActivity {
  projectId: string;
  totalCommits: number;
  activeDays: number;
  maxCommitsPerDay: number;
  days: ProjectCommitActivityDay[];
  recentCommits: { hash: string; message: string; author: string; date: string }[];
  isGitRepo: boolean;
  error?: string;
}

export interface RuntimeProfile {
  id: string;
  name: string;
  command: string;
  version?: string;
  path?: string;
  role: string;
  capabilities: string[];
  model: string;
  transport: "stdio" | "tcp";
  enabled: boolean;
  currentModel?: string;
  status: "idle" | "active" | "error";
  registryId?: string;
  supportsMultimodal?: boolean;
}

export interface RuntimeModelsResponse {
  models: string[];
  currentModel?: string;
  source: "cli" | "config" | "registry";
}

export type NotificationEvent =
  | "email"
  | "calendar"
  | "message"
  | "reminder"
  | "system"
  | "social";

export const NOTIFICATION_EVENTS: { id: NotificationEvent; labelKey: string }[] = [
  { id: "email", labelKey: "event_email" },
  { id: "calendar", labelKey: "event_calendar" },
  { id: "message", labelKey: "event_message" },
  { id: "reminder", labelKey: "event_reminder" },
  { id: "system", labelKey: "event_system" },
  { id: "social", labelKey: "event_social" },
];

export const AVAILABLE_SOUNDS = [
  { id: "bell", labelKey: "sound_bell_1", file: "/sounds/bell.mp3" },
  { id: "bell2", labelKey: "sound_bell_2", file: "/sounds/bell2.mp3" },
  { id: "bell3", labelKey: "sound_bell_3", file: "/sounds/bell3.mp3" },
  { id: "error", labelKey: "sound_error", file: "/sounds/error.mp3" },
  { id: "pop", labelKey: "sound_pop", file: "" },
  { id: "pong", labelKey: "sound_pong", file: "/sounds/pong.mp3" },
  { id: "ring", labelKey: "sound_ring_1", file: "/sounds/ring.mp3" },
  { id: "ring2", labelKey: "sound_ring_2", file: "/sounds/ring2.mp3" },
] as const;

export type SoundId = (typeof AVAILABLE_SOUNDS)[number]["id"];

export interface ControlSettings {
  autoCommit: boolean;
  autoFix: boolean;
  modelStrategy: "local-first" | "cloud-first" | "adaptive";
  locale: string;
  timezone: string;
  defaultRuntimeId?: string;
  projectChatsRequireSandbox: boolean;
  showShortcutHints: boolean;
  sendShortcut: "enter" | "cmd-enter";
  useMixedScript: boolean;
  preferKanji: boolean;
  notifications: {
    system: boolean;
    sound: boolean;
    eventSounds: Partial<Record<NotificationEvent, boolean>>;
    eventSoundFiles: Partial<Record<NotificationEvent, SoundId>>;
  };
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

export interface Rule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: string;
  action: string;
  createdAt: string;
  updatedAt?: string;
}

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

export interface Organization {
  id: string;
  name: string;
}

export interface Problem {
  id: string;
  title: string;
  priority: ProblemPriority;
  source?: string;
  context?: string;
  suggestedGoal?: string;
  status: ProblemStatus;
  actions: string[];
  createdAt: string;
  updatedAt: string;
}

export type BoardTaskColumnId = "planning" | "in_progress" | "review" | "completed";
export type BoardTaskFilter = "all" | BoardTaskColumnId;
export type BoardTaskPriority = "low" | "medium" | "high";

export interface BoardTask {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  dueDate?: string;
  priority: BoardTaskPriority;
  tags: string[];
  subtasks: string[];
  column: BoardTaskColumnId;
  createdAt: string;
  updatedAt: string;
}

export function isInboxItem(problem: Problem): problem is Problem & { source: InboxSource } {
  return INBOX_SOURCES.includes(problem.source as InboxSource);
}

export function isSystemProblem(
  problem: Problem,
): problem is Problem & { source: SystemProblemSource } {
  return SYSTEM_SOURCES.includes(problem.source as SystemProblemSource);
}

export type SidebarView =
  | "inbox"
  | "creation"
  | "bookmarks"
  | "board"
  | "calendar"
  | "mail"
  | "observability"
  | "agents";
