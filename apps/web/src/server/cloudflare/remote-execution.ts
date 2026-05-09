import { getSandbox } from "@cloudflare/sandbox";
import {
  configureRemoteExecutionAdapter,
  type ProjectExecutionTarget,
  type PreparedProjectWorkspace,
} from "../runtime/execution-adapter";
import type { ExecutorConfig, ExecutionResult } from "../modules/execution/executor";

const DEFAULT_TIMEOUT = 60000;
const DEFAULT_SANDBOX_ID = "orchos-executor";
const DEFAULT_SANDBOX_ROOT = "/workspace";
const PROJECTS_ROOT = "/workspace/projects";
const PREPARED_MARKER = ".orchos-sandbox-ready";

function sanitizeSegment(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  return normalized.replace(/^-+|-+$/g, "") || "default";
}

function getRepoName(repositoryUrl?: string) {
  if (!repositoryUrl) return undefined;
  const candidate = repositoryUrl
    .trim()
    .split("/")
    .pop()
    ?.replace(/\.git$/, "");
  return candidate || undefined;
}

function getSandboxId(project?: ProjectExecutionTarget) {
  return project ? `project-${sanitizeSegment(project.id)}` : DEFAULT_SANDBOX_ID;
}

function getRootPath(project: ProjectExecutionTarget) {
  const repoName = getRepoName(project.repositoryUrl) || project.id;
  return `${PROJECTS_ROOT}/${sanitizeSegment(project.id)}-${sanitizeSegment(repoName)}`;
}

function getWorkingPath(project: ProjectExecutionTarget, rootPath: string) {
  const repoName = getRepoName(project.repositoryUrl);
  const projectPath = project.path?.replace(/\\/g, "/");
  if (!repoName || !projectPath) return rootPath;

  const repoBoundary = `/${repoName}/`;
  const repoTail = `/${repoName}`;

  if (projectPath.endsWith(repoTail)) return rootPath;

  const boundaryIndex = projectPath.lastIndexOf(repoBoundary);
  if (boundaryIndex === -1) return rootPath;

  const suffix = projectPath.slice(boundaryIndex + repoBoundary.length).replace(/^\/+|\/+$/g, "");
  return suffix ? `${rootPath}/${suffix}` : rootPath;
}

function normalizeSandboxCwd(cwd?: string) {
  if (!cwd) return DEFAULT_SANDBOX_ROOT;
  if (cwd.startsWith("/workspace") || cwd.startsWith("/tmp")) return cwd;
  return DEFAULT_SANDBOX_ROOT;
}

function filterEnv(env?: Record<string, string>) {
  if (!env) return undefined;
  const entries = Object.entries(env).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

async function pathExists(sandbox: ReturnType<typeof getSandbox>, path: string) {
  const result = await sandbox.exists(path);
  return result.success && result.exists;
}

async function ensureGitIdentity(sandbox: ReturnType<typeof getSandbox>, rootPath: string) {
  if (!(await pathExists(sandbox, `${rootPath}/.git`))) return;

  await sandbox.exec(`git config user.name "Orchos Sandbox"`, { cwd: rootPath, timeout: 15000 });
  await sandbox.exec(`git config user.email "sandbox@orchos.local"`, {
    cwd: rootPath,
    timeout: 15000,
  });
}

async function getInstallCommands(sandbox: ReturnType<typeof getSandbox>, rootPath: string) {
  if (!(await pathExists(sandbox, `${rootPath}/package.json`))) return [] as string[];

  if (
    (await pathExists(sandbox, `${rootPath}/bun.lock`)) ||
    (await pathExists(sandbox, `${rootPath}/bun.lockb`))
  ) {
    return ["bun install --frozen-lockfile", "bun install"];
  }

  if (await pathExists(sandbox, `${rootPath}/pnpm-lock.yaml`)) {
    return ["pnpm install --frozen-lockfile", "pnpm install"];
  }

  if (await pathExists(sandbox, `${rootPath}/yarn.lock`)) {
    return ["yarn install --immutable", "yarn install"];
  }

  if (await pathExists(sandbox, `${rootPath}/package-lock.json`)) {
    return ["npm ci", "npm install"];
  }

  return ["npm install"];
}

async function ensureDependencies(sandbox: ReturnType<typeof getSandbox>, rootPath: string) {
  if (await pathExists(sandbox, `${rootPath}/${PREPARED_MARKER}`)) return;

  const installCommands = await getInstallCommands(sandbox, rootPath);
  if (installCommands.length === 0) return;

  let lastError = "Failed to install dependencies";

  const results = await Promise.all(
    installCommands.map((command) =>
      sandbox.exec(command, { cwd: rootPath, timeout: 300000 }),
    ),
  );

  for (const result of results) {
    if (result.success) {
      await sandbox.writeFile(`${rootPath}/${PREPARED_MARKER}`, new Date().toISOString());
      return;
    }
    lastError = result.stderr || result.stdout || lastError;
  }

  throw new Error(lastError);
}

async function prepareProjectWorkspace(
  env: Cloudflare.Env,
  project: ProjectExecutionTarget,
): Promise<PreparedProjectWorkspace> {
  const sandbox = getSandbox(env.Sandbox, getSandboxId(project), { normalizeId: true });
  const rootPath = getRootPath(project);
  const workingPath = getWorkingPath(project, rootPath);

  await sandbox.mkdir(PROJECTS_ROOT, { recursive: true });

  if (project.repositoryUrl) {
    if (!(await pathExists(sandbox, `${rootPath}/.git`))) {
      await sandbox.gitCheckout(project.repositoryUrl, {
        targetDir: rootPath,
        depth: 1,
      });
    }
  } else {
    await sandbox.mkdir(rootPath, { recursive: true });
  }

  await Promise.all([
    ensureGitIdentity(sandbox, rootPath),
    ensureDependencies(sandbox, rootPath),
    sandbox.mkdir(workingPath, { recursive: true }),
  ]);

  return {
    sandboxId: getSandboxId(project),
    rootPath,
    workingPath,
  };
}

function createCloudflareRemoteExecutionAdapter(env: Cloudflare.Env) {
  return {
    async run(command: string, config?: ExecutorConfig): Promise<ExecutionResult> {
      try {
        const sandbox = getSandbox(env.Sandbox, DEFAULT_SANDBOX_ID, { normalizeId: true });
        const result = await sandbox.exec(command, {
          cwd: normalizeSandboxCwd(config?.cwd),
          timeout: config?.timeout ?? DEFAULT_TIMEOUT,
          env: filterEnv(config?.env),
        });

        return {
          success: result.success,
          output: result.stdout,
          error: result.stderr || undefined,
          exitCode: result.exitCode,
        };
      } catch (error) {
        return {
          success: false,
          output: "",
          error: error instanceof Error ? error.message : String(error),
          exitCode: 1,
        };
      }
    },

    async prepareProject(project: ProjectExecutionTarget): Promise<PreparedProjectWorkspace> {
      return prepareProjectWorkspace(env, project);
    },
  };
}

export function configureCloudflareSandboxExecution(env?: Cloudflare.Env) {
  configureRemoteExecutionAdapter(env ? createCloudflareRemoteExecutionAdapter(env) : undefined);
}
