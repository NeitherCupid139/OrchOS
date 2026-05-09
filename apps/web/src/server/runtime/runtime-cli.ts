import {
  getRemoteExecutionAdapter,
  type DetectedRuntime,
  type RuntimeChatResult,
  type RuntimeHealthCheckResult,
  type RuntimeModelResult,
} from "@/server/runtime/execution-adapter";

export interface RuntimeExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}

export interface RuntimeExecutorConfig {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

type RuntimeSpawn = (options: {
  cmd: string[];
  cwd: string;
  env: Record<string, string>;
  stdout: "pipe";
  stderr: "pipe";
}) => {
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  kill: () => void;
  exited: Promise<number>;
};

let cachedSpawn: RuntimeSpawn | undefined;
const DEFAULT_TIMEOUT = 60000;

function getSpawn(): RuntimeSpawn | undefined {
  if (cachedSpawn !== undefined) return cachedSpawn;

  const bunRuntime = globalThis as typeof globalThis & {
    Bun?: { spawn?: RuntimeSpawn };
  };

  cachedSpawn = bunRuntime.Bun?.spawn;
  return cachedSpawn;
}

const AGENT_CLI_REGISTRY = [
  { id: "pi", name: "Pi", command: "pi", versionFlag: "--version", role: "Conversational AI assistant", capabilities: ["write_code", "fix_bug", "review"], model: "local/pi", invokeTemplate: { cmdTemplate: "echo '$PROMPT' | pi --output-format text 2>&1 | head -20", successIndicators: ["pi"], timeout: 30000 } },
  { id: "claude-code", name: "Claude Code", command: "claude", versionFlag: "--version", role: "Code generation & reasoning", capabilities: ["write_code", "fix_bug", "review"], model: "cloud/claude-sonnet-4", invokeTemplate: { cmdTemplate: "claude -p '$PROMPT' 2>&1 | head -20", successIndicators: ["claude"], timeout: 60000 }, modelQuery: { cmd: "claude --version 2>&1", extractPattern: "Claude Code" } },
  { id: "codex", name: "Codex", command: "codex", versionFlag: "--version", role: "Code generation & editing", capabilities: ["write_code", "fix_bug"], model: "local/codex", invokeTemplate: { cmdTemplate: "echo '$PROMPT' | codex 2>&1 | head -20", successIndicators: ["codex", "CodeX"], timeout: 30000 } },
  { id: "opencode", name: "OpenCode", command: "opencode", versionFlag: "--version", role: "Open-source code generation", capabilities: ["write_code", "fix_bug", "review"], model: "local/opencode", invokeTemplate: { cmdTemplate: "echo '$PROMPT' | opencode 2>&1 | head -20", successIndicators: ["opencode", "OpenCode"], timeout: 30000 } },
] as const;

function getRuntimeRegistryEntry(runtimeId: string) {
  return AGENT_CLI_REGISTRY.find((entry) => entry.id === runtimeId);
}

export async function runRuntimeCommand(command: string, config: RuntimeExecutorConfig = {}): Promise<RuntimeExecutionResult> {
  const remoteAdapter = getRemoteExecutionAdapter();
  if (remoteAdapter) {
    const result = await remoteAdapter.run(command, config);
    return {
      success: result.success,
      output: result.output,
      error: result.error,
      exitCode: result.exitCode ?? (result.success ? 0 : 1),
    };
  }
  const spawnFn = getSpawn();
  if (!spawnFn) {
    return { success: false, output: "", error: "Executor not available in this environment", exitCode: 1 };
  }
  const { cwd = process.cwd(), timeout = DEFAULT_TIMEOUT, env = {} } = config;
  try {
    const mergedEnv = Object.fromEntries(Object.entries({ ...process.env, ...env }).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
    const proc = spawnFn({ cmd: ["sh", "-c", command], cwd, env: mergedEnv, stdout: "pipe", stderr: "pipe" });
    const timer = setTimeout(() => proc.kill(), timeout);
    const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
    clearTimeout(timer);
    const exitCode = await proc.exited;
    return { success: exitCode === 0, output: stdout, error: stderr || undefined, exitCode };
  } catch (err) {
    return { success: false, output: "", error: err instanceof Error ? err.message : String(err), exitCode: 1 };
  }
}

export async function detectRuntimeCLIs() {
  const remoteAdapter = getRemoteExecutionAdapter();
  if (remoteAdapter?.detectRuntimes) {
    return remoteAdapter.detectRuntimes();
  }

  const available: DetectedRuntime[] = [];
  const unavailable: DetectedRuntime[] = [];

  const whichResults = await Promise.all(
    AGENT_CLI_REGISTRY.map((agent) =>
      runRuntimeCommand(`which ${agent.command}`).then((result) => ({ agent, result })),
    ),
  );

  const versionPromises: Promise<{ agent: (typeof AGENT_CLI_REGISTRY)[number]; version: string | undefined }>[] = [];

  for (const { agent, result } of whichResults) {
    const base = { id: agent.id, name: agent.name, command: agent.command, role: agent.role, capabilities: [...agent.capabilities], model: agent.model, transport: "stdio" as const };
    if (result.success) {
      if (agent.versionFlag) {
        versionPromises.push(
          runRuntimeCommand(`${agent.command} ${agent.versionFlag}`).then((versionResult) => {
            let version: string | undefined;
            if (versionResult.success) {
              const versionOutput = versionResult.output.trim().split("\n")[0]?.trim() ?? "";
              const versionMatch = versionOutput.match(/v?\d+(\.\d+)+/);
              version = versionMatch ? versionMatch[0] : versionOutput;
            }
            return { agent, version };
          }),
        );
        available.push({ ...base, path: result.output.trim(), version: undefined });
      } else {
        available.push({ ...base, path: result.output.trim(), version: undefined });
      }
    } else {
      unavailable.push({ ...base, error: `${agent.command} not found in PATH` });
    }
  }

  if (versionPromises.length > 0) {
    const versionResults = await Promise.all(versionPromises);
    for (const v of versionResults) {
      const entry = available.find((a) => a.id === v.agent.id);
      if (entry) entry.version = v.version;
    }
  }
  return { available, unavailable };
}

export async function runtimeHealthCheck(runtimeId: string, options?: { level?: "basic" | "ping" | "full"; prompt?: string }): Promise<RuntimeHealthCheckResult> {
  const remoteAdapter = getRemoteExecutionAdapter();
  if (remoteAdapter?.runtimeHealthCheck) {
    return remoteAdapter.runtimeHealthCheck(runtimeId, options);
  }

  const agent = getRuntimeRegistryEntry(runtimeId);
  if (!agent) {
    return { healthy: false, level: "basic" as const, output: "", error: `Unknown agent ID: ${runtimeId}`, responseTime: 0, agentName: runtimeId, agentCommand: runtimeId };
  }
  const whichResult = await runRuntimeCommand(`which ${agent.command}`);
  if (!whichResult.success) {
    return { healthy: false, level: "basic" as const, output: "", error: `${agent.command} not found in PATH`, responseTime: 0, agentName: agent.name, agentCommand: agent.command };
  }
  const level = options?.level || "basic";
  if (level === "basic") {
    const startTime = Date.now();
    const checkCmd = agent.versionFlag ? `${agent.command} ${agent.versionFlag}` : `${agent.command} --help`;
    const result = await runRuntimeCommand(checkCmd, { timeout: 10000 });
    return { healthy: result.success, level, output: result.output.trim().slice(0, 1000), error: result.success ? undefined : result.error, responseTime: Date.now() - startTime, agentName: agent.name, agentCommand: agent.command };
  }
  if (!agent.invokeTemplate) {
    return { healthy: false, level, output: "", error: `No invoke template for ${agent.name}`, responseTime: 0, agentName: agent.name, agentCommand: agent.command };
  }
  const testPrompt = options?.prompt || (level === "ping" ? "hello" : "Say hello and tell me your name.");
  const cmd = agent.invokeTemplate.cmdTemplate.replace("$PROMPT", testPrompt.replace(/'/g, "'\\''"));
  const timeout = level === "ping" ? Math.min(agent.invokeTemplate.timeout || 15000, 15000) : agent.invokeTemplate.timeout || 60000;
  const startTime = Date.now();
  const result = await runRuntimeCommand(cmd, { timeout });
  const output = `${result.output}\n${result.error ?? ""}`.trim();
  const authRequired = /auth|api key|login/i.test(output);
  return { healthy: result.success, level, output: result.output.trim().slice(0, 1000), error: result.success ? undefined : result.error, responseTime: Date.now() - startTime, agentName: agent.name, agentCommand: agent.command, authRequired };
}

export async function getRuntimeCurrentModel(runtimeId: string, fallbackModel?: string): Promise<RuntimeModelResult> {
  const remoteAdapter = getRemoteExecutionAdapter();
  if (remoteAdapter?.getRuntimeCurrentModel) {
    return remoteAdapter.getRuntimeCurrentModel(runtimeId, fallbackModel);
  }

  const agent = getRuntimeRegistryEntry(runtimeId);
  if (!agent) return { model: fallbackModel, source: "registry" as const };
  const modelQuery = "modelQuery" in agent ? agent.modelQuery : undefined;
  if (modelQuery) {
    const result = await runRuntimeCommand(modelQuery.cmd);
    if (result.success && result.output.trim()) {
      let modelOutput = result.output.trim().split("\n")[0]?.trim() ?? "";
      if (modelQuery.extractPattern) {
        const match = result.output.match(new RegExp(modelQuery.extractPattern, "i"));
        if (match) modelOutput = match[0].trim();
      }
      return { model: modelOutput, source: "cli" as const, rawOutput: result.output.trim() };
    }
  }
  return { model: fallbackModel || agent.model, source: "registry" as const };
}

export async function chatWithRuntimeCommand(command: string, prompt: string, runtimeName: string): Promise<RuntimeChatResult> {
  const remoteAdapter = getRemoteExecutionAdapter();
  if (remoteAdapter?.chatWithRuntime) {
    return remoteAdapter.chatWithRuntime(command, prompt, runtimeName);
  }

  const startTime = Date.now();
  const result = await runRuntimeCommand(`${command} -p '${prompt.replace(/'/g, "'\\''")}' 2>&1`, { timeout: 120000 });
  return {
    success: result.success || result.output.trim().length > 0,
    output: result.output.trim(),
    error: result.success ? undefined : result.error,
    agentName: runtimeName,
    responseTime: Date.now() - startTime,
  };
}
