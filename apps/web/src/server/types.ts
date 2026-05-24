export type Status = "success" | "failed" | "error" | "pending" | "running" | "warning";

export type Action = "write_code" | "run_tests" | "fix_bug" | "commit" | "review";

export type EventType =
  | "test_failed"
  | "review_rejected"
  | "build_success";

export interface Project {
  id: string;
  name: string;
  path: string;
  repositoryUrl?: string;
  createdAt: string;
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

export interface Event {
  id: string;
  type: EventType;
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
