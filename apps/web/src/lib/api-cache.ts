/**
 * In-memory TTL cache for API responses.
 * Reduces redundant network requests when the same data is fetched
 * multiple times within a short window (e.g. route transitions).
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 30_000; // 30 seconds
const TTL_OVERRIDES: Record<string, number> = {
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
  getObservabilityThroughput: 30_000,
  getObservabilityMetrics: 30_000,
};

/** Cache keys that should be invalidated when certain mutation methods are called. */
const INVALIDATION_MAP: Record<string, string[]> = {
  listRuntimes: ["updateRuntime", "registerDetectedRuntimes"],
  getSettings: ["updateSettings"],
  listOrganizations: ["createOrganization", "updateOrganization", "deleteOrganization"],
  listProjects: ["createProject", "updateProject", "deleteProject"],
  getProject: ["createProject", "updateProject", "deleteProject"],
  getProblemSummary: ["createProblem", "updateProblem", "deleteProblem", "bulkUpdateProblems"],
  listProblems: ["createProblem", "updateProblem", "deleteProblem", "bulkUpdateProblems"],
  getProblemCounts: ["createProblem", "updateProblem", "deleteProblem", "bulkUpdateProblems"],
  listConversations: ["createConversation", "updateConversation", "deleteConversation", "clearDeletedConversations"],
  listBookmarks: ["replaceBookmarks", "createBookmarkCategory", "createBookmarkItem", "updateBookmarkCategory", "deleteBookmarkCategory", "updateBookmarkItem", "deleteBookmarkItem", "moveBookmarkItem"],
  listCustomAgents: ["createCustomAgent", "updateCustomAgent", "deleteCustomAgent", "setDefaultCustomAgentId"],
  listInboxThreads: ["updateInboxThread", "addInboxMessage"],
  getPlannerStore: ["createPlannerCalendar", "updatePlannerCalendar", "deletePlannerCalendar", "createPlannerEvent", "updatePlannerEvent", "createPlannerReminder", "updatePlannerReminder", "deletePlannerReminder"],
  listIntegrations: ["connectIntegration", "connectGoogleIntegration", "createSmtpImapAccount", "updateIntegrationAccount", "deleteIntegrationAccount", "disconnectIntegration"],
  listLocalAgents: ["createLocalAgentPairingToken"],
};

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttl?: number): void {
  store.set(key, {
    data,
    expiresAt: Date.now() + (ttl ?? TTL_OVERRIDES[key] ?? DEFAULT_TTL_MS),
  });
}

export function invalidateCache(key: string): void {
  store.delete(key);
}

/**
 * Given called mutation method name, invalidate all dependent cache entries.
 */
export function invalidateDependentCaches(methodName: string): void {
  for (const [cacheKey, mutators] of Object.entries(INVALIDATION_MAP)) {
    if (mutators.includes(methodName)) {
      store.delete(cacheKey);
    }
  }
}

export function clearAllCaches(): void {
  store.clear();
}

/**
 * Wrap an async API method with cache-read + cache-write logic.
 * Only GET/list methods should be wrapped.
 */
export function withCache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  cacheKey: string,
  ttl?: number,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const cached = getCached<TResult>(cacheKey);
    if (cached !== undefined) return cached;

    const result = await fn(...args);
    setCache(cacheKey, result, ttl);
    return result;
  };
}
