/**
 * Credits client — wraps @orchos/pro credits middleware with safe fallback.
 *
 * When VITE_ENABLE_PRO=true and @orchos/pro is available, this
 * provides real credits checking and deduction.
 * In OSS builds, it allows all requests (no credit limits).
 */

import { isProEnabled } from "@/lib/pro-loader";

interface CreditsCheckResult {
  allowed: boolean;
  remainingCredits: number;
  remainingTokens: number;
  reason?: string;
}

interface CreditsMiddlewareConfig {
  apiEndpoint: string;
  apiKey: string;
}

/**
 * Check if a user has enough credits before an AI call.
 * In OSS mode, always returns allowed.
 */
export async function checkCredits(
  _userId: string,
  plan: "free" | "pro",
  creditsBalance: number,
  estimatedTokens?: number,
): Promise<CreditsCheckResult> {
  if (!isProEnabled()) {
    return { allowed: true, remainingCredits: Infinity, remainingTokens: Infinity };
  }

  try {
    const mod = await import("@orchos/pro/credits/middleware");
    return mod.checkCredits(plan, creditsBalance, estimatedTokens ?? 0);
  } catch {
    return { allowed: true, remainingCredits: Infinity, remainingTokens: Infinity };
  }
}

/**
 * Deduct tokens from a user's credit balance after an AI call.
 * In OSS mode, no-op.
 */
export async function deductCredits(
  config: CreditsMiddlewareConfig,
  userId: string,
  tokens: number,
  action: string,
): Promise<void> {
  if (!isProEnabled() || tokens <= 0) return;

  try {
    const mod = await import("@orchos/pro/credits/middleware");
    await mod.deductCredits(config, userId, tokens, action);
  } catch {
    // Fail silently in OSS builds
  }
}
