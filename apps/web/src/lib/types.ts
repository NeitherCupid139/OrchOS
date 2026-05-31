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
  locale: Locale;
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

export type SidebarView =
  | "inbox"
  | "creation"
  | "bookmarks"
  | "board"
  | "calendar"
  | "mail"
  | "observability"
  | "agents";
import type { Locale } from "@/paraglide/runtime";
