import { createClientOnlyFn } from "@tanstack/react-start";
import {
  getCached,
  setCache,
  invalidateDependentCaches,
  clearAllCaches,
} from "./api-cache";

type ClientApi = typeof import("./api.client")["api"];

/** Cache TTL overrides per method key */
const READ_CACHE_TTL: Record<string, number> = {
  listRuntimes: 30_000,
  listLocalAgents: 30_000,
  listProjects: 30_000,
  getSettings: 60_000,
  listOrganizations: 30_000,
  getProblemSummary: 10_000,
  listProblems: 10_000,
  getProblemCounts: 10_000,
  listConversations: 30_000,
  listBookmarks: 30_000,
  listCustomAgents: 30_000,
  listIntegrations: 30_000,
  getPlannerStore: 30_000,
  listInboxThreads: 15_000,
  listGoogleCalendarEvents: 15_000,
  listRuntimeModels: 30_000,
  getObservabilityThroughput: 30_000,
  getObservabilityMetrics: 30_000,
  getAgentMetrics: 30_000,
  getAgentTimeline: 30_000,
  getActivityHeatmap: 30_000,
  getSubscription: 60_000,
  getCreditUsage: 30_000,
  browseDirectory: 10_000,
};

/** Method names that are read-only (no side effects) */
const READ_METHODS = new Set(Object.keys(READ_CACHE_TTL));

const loadClientApi = createClientOnlyFn(async (): Promise<ClientApi> => {
  const { api } = await import("./api.client");
  return api;
});

let clientApiPromise: Promise<ClientApi> | null = null;
let resolvedClient: ClientApi | null = null;

async function getClientApi(): Promise<ClientApi> {
  if (resolvedClient) return resolvedClient;
  if (!clientApiPromise) {
    clientApiPromise = loadClientApi();
  }
  const client = await clientApiPromise;
  resolvedClient = client;
  return client;
}

// Cache method references after first resolution to avoid Proxy overhead.
// LRU-bounded to prevent unbounded closure accumulation.
const methodCache = new Map<string, (...args: unknown[]) => unknown>();
const MAX_METHOD_CACHE_SIZE = 30;

function createCachedProxyMethod(property: string): (...args: unknown[]) => unknown {
  const cached = methodCache.get(property);
  if (cached) return cached;

  const fn = async (...args: unknown[]) => {
    const clientApi = await getClientApi();
    const value = clientApi[property as keyof ClientApi];

    if (typeof value !== "function") {
      return value;
    }

    // For read methods: check cache first, then store result
    if (READ_METHODS.has(property)) {
      const cacheKey = property;
      const cachedResult = getCached(cacheKey);
      if (cachedResult !== undefined) return cachedResult;

      const result = await (value as (...fnArgs: unknown[]) => unknown)(...args);
      setCache(cacheKey, result, READ_CACHE_TTL[property]);
      return result;
    }

    // For all other (mutation) methods: invalidate dependent caches, then call
    invalidateDependentCaches(property);
    return (value as (...fnArgs: unknown[]) => unknown)(...args);
  };

  // LRU eviction: if at capacity, remove the oldest entry
  if (methodCache.size >= MAX_METHOD_CACHE_SIZE) {
    const firstKey = methodCache.keys().next().value;
    if (firstKey !== undefined) methodCache.delete(firstKey);
  }

  methodCache.set(property, fn);
  return fn;
}

export const api = new Proxy({} as ClientApi, {
  get(_target, property) {
    const key = String(property);
    return createCachedProxyMethod(key);
  },
});

export { normalizeConversationMessage, normalizeInboxThread, normalizeTrace } from "./api.normalizers";
export { isRecord, readString, resolveApiUrl } from "./api.shared";
export type * from "./api.types";

/** Clear all cached API responses (e.g. on sign-out) */
export function clearApiCache() {
  clearAllCaches();
}
