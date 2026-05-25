/**
 * Dynamic import loader for @orchos/pro (private package).
 *
 * In open-source builds (VITE_ENABLE_PRO !== 'true'), all pro imports return null.
 * When the pro package is available, its modules are loaded dynamically.
 *
 * This is the ONLY file in the public repo that directly imports from @orchos/pro.
 * All other public code gatekeeps pro features through these helper functions.
 */

const PRO_ENABLED =
  typeof process !== "undefined" &&
  process.env?.VITE_ENABLE_PRO === "true";

/**
 * Try to dynamically import a module from the @orchos/pro package.
 * Returns null if the pro package is not available.
 */
export async function tryImportPro<T>(
  modulePath: string,
): Promise<T | null> {
  if (!PRO_ENABLED) return null;
  try {
    const mod = await import(/* @vite-ignore */ `@orchos/pro/${modulePath}`);
    return mod as T;
  } catch {
    return null;
  }
}

/**
 * Synchronous check — returns true if the pro package is enabled at build time.
 */
export function isProEnabled(): boolean {
  return PRO_ENABLED;
}
