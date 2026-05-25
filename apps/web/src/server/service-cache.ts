import type { AppDb } from "@/server/db/types";

/**
 * Creates a lazily-initialized, module-level singleton for stateless services.
 *
 * Services that take a `db: AppDb` parameter and proxy DB access
 * are instantiated once and reused across all requests, avoiding
 * per-request GC pressure.
 *
 * @param factory  A constructor function that takes db and returns a service.
 * @returns        A function that, given a db instance, returns the cached service.
 */
export function createServiceCache<T>(factory: (db: AppDb) => T): (db: AppDb) => T {
  let cached: T | null = null;
  let cachedDb: AppDb | null = null;

  return (db: AppDb): T => {
    if (cachedDb === db && cached !== null) return cached;
    cached = factory(db);
    cachedDb = db;
    return cached;
  };
}
