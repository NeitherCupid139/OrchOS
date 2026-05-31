export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
}

export interface ExecutorConfig {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface ProjectExecutionTarget {
  id: string;
  path?: string;
  repositoryUrl?: string;
}

export interface PreparedProjectWorkspace {
  sandboxId: string;
  rootPath: string;
  workingPath: string;
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

export interface RuntimeHealthCheckResult {
  healthy: boolean;
  level: "basic" | "ping" | "full";
  output: string;
  error?: string;
  responseTime: number;
  agentName: string;
  agentCommand: string;
  authRequired?: boolean;
}

export interface RuntimeModelResult {
  model?: string;
  source: "cli" | "registry";
  rawOutput?: string;
}

export interface RuntimeChatResult {
  success: boolean;
  output: string;
  error?: string;
  agentName: string;
  responseTime: number;
}

export interface RemoteExecutionAdapter {
  run(command: string, config?: ExecutorConfig): Promise<ExecutionResult>;
  prepareProject?(project: ProjectExecutionTarget): Promise<PreparedProjectWorkspace>;
  detectRuntimes?(): Promise<{
    available: DetectedRuntime[];
    unavailable: DetectedRuntime[];
  }>;
  runtimeHealthCheck?(
    runtimeId: string,
    options?: { level?: "basic" | "ping" | "full"; prompt?: string },
  ): Promise<RuntimeHealthCheckResult>;
  getRuntimeCurrentModel?(runtimeId: string, fallbackModel?: string): Promise<RuntimeModelResult>;
  chatWithRuntime?(command: string, prompt: string, runtimeName: string): Promise<RuntimeChatResult>;
}

export function getRemoteExecutionAdapter() {
  return undefined as RemoteExecutionAdapter | undefined;
}
