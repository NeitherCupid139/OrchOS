import type { ControlSettings as ControlSettingsType } from "./types";

export type ProblemPriority = "critical" | "warning" | "info";
export type ProblemStatus = "open" | "fixed" | "ignored" | "assigned";

export interface Project {
  id: string;
  name: string;
  path: string;
  repositoryUrl?: string;
  createdAt: string;
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

export interface ProjectCommandResult {
  success: boolean;
  output: string;
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
}

export interface RuntimeModelsResponse {
  models: string[];
  currentModel?: string;
  source: "cli" | "config" | "registry";
}

export interface DetectedRuntime {
  id: string;
  name: string;
  command: string;
  version?: string;
  path?: string;
  role: string;
  capabilities: string[];
  model: string;
  transport: "stdio" | "tcp";
  error?: string;
}

export interface DetectRuntimesResponse {
  available: DetectedRuntime[];
  unavailable: DetectedRuntime[];
}

export interface LocalAgentProfile {
  id: string;
  userId: string;
  organizationId?: string;
  deviceId: string;
  name: string;
  platform?: string;
  appVersion?: string;
  status: "online" | "offline";
  runtimes: DetectedRuntime[];
  metadata: Record<string, string>;
  registeredAt: string;
  lastSeenAt: string;
}

export interface LocalAgentPairingToken {
  pairingToken: string;
  expiresAt: string;
}

export interface RegisterRuntimesResponse {
  registered: RuntimeProfile[];
  skipped: DetectedRuntime[];
}

export interface Integration {
  id: string;
  name: string;
  type: "github" | "gitlab";
  connected: boolean;
  username?: string;
}

export interface IntegrationRepo {
  id: number | string;
  name: string;
  url: string;
  private: boolean;
}

export interface EventTypeCount {
  type: string;
  count: number;
}

export interface ObservabilityMetrics {
  totalEvents: number;
  openIssues: number;
  resolvedIssues: number;
  eventTypeCounts: EventTypeCount[];
  recentEvents: Event[];
}

export interface TimeSeriesPoint {
  time: number;
  label: string;
  events: number;
  issues: number;
}

export type ControlSettings = ControlSettingsType;

export interface Event {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
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

export interface Conversation {
  id: string;
  title?: string;
  projectId?: string;
  runtimeId?: string;
  archived: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  trace?: Array<
    | { kind: "message"; text: string }
    | { kind: "thought"; text: string }
    | {
        kind: "tool";
        toolName?: string;
        toolCallId?: string;
        state?: string;
        input?: unknown;
        output?: unknown;
        errorText?: string;
      }
  >;
  error?: string;
  responseTime?: number;
  executionMode?: "sandbox" | "local";
  sandboxStatus?: "created" | "reused" | "fallback" | "required_failed";
  sandboxVmId?: string;
  projectId?: string;
  projectName?: string;
  clarificationQuestions?: string[];
  createdAt: string;
}

export interface ProblemSummary {
  status: Record<ProblemStatus, number>;
  inbox: {
    all: number;
    github_pr: number;
    github_issue: number;
    mention: number;
    agent_request: number;
  };
  system: {
    critical: number;
    warning: number;
    info: number;
  };
}

export type InboxThreadKind =
  | "agent_request"
  | "pull_request"
  | "issue"
  | "mention"
  | "system_alert";

export type InboxThreadStatus =
  | "open"
  | "in_progress"
  | "blocked"
  | "waiting_user"
  | "completed"
  | "dismissed";

export type InboxPriority = "critical" | "warning" | "info";

export type InboxMessageType =
  | "request"
  | "status_update"
  | "question"
  | "blocker"
  | "artifact"
  | "review_request"
  | "completion"
  | "system_note";

export interface InboxThread {
  id: string;
  kind: InboxThreadKind;
  status: InboxThreadStatus;
  priority: InboxPriority;
  title: string;
  summary?: string;
  projectId?: string;
  conversationId?: string;
  commandId?: string;
  primaryGoalId?: string;
  createdByType: "user" | "agent" | "system";
  createdById?: string;
  createdByName: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface InboxMessage {
  id: string;
  threadId: string;
  messageType: InboxMessageType;
  senderType: "user" | "agent" | "system";
  senderId?: string;
  senderName: string;
  subject?: string;
  body: string;
  to: string[];
  cc: string[];
  problemId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  pinned: boolean;
}

export interface BookmarkCategory {
  id: string;
  name: string;
  icon: string;
  bookmarks: BookmarkItem[];
}

export interface CustomAgent {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  model: string;
  createdAt: string;
}

export interface CustomAgentModelsResponse {
  models: string[];
}
