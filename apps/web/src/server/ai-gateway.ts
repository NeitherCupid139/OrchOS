/**
 * Server-side AI Gateway config reader.
 *
 * Reads Cloudflare AI Gateway configuration from environment variables.
 * This is used to route AI API calls through Cloudflare AI Gateway
 * for observability, caching, and rate limiting.
 *
 * Gateway routing applies to both:
 * - Custom agents (OpenAI-compatible APIs)
 * - Built-in OrchOS Agent
 *
 * Config comes from wrangler env vars:
 *   CF_AI_GATEWAY_ACCOUNT_ID
 *   CF_AI_GATEWAY_NAME (default: "default")
 *   CF_AI_GATEWAY_API_KEY
 */

import type { AIGatewayConfig } from "@orchos/pro/ai-gateway";

/**
 * Returns AI Gateway config if all required env vars are set.
 * Returns null in OSS builds (where @orchos/pro is not available).
 */
export async function getAIGatewayConfig(): Promise<AIGatewayConfig | null> {
  try {
    const { isProEnabled } = await import("@/lib/pro-loader");
    if (!isProEnabled()) return null;

    const accountId = process.env.CF_AI_GATEWAY_ACCOUNT_ID?.trim();
    const gateway = process.env.CF_AI_GATEWAY_NAME?.trim() || "orchos";
    const apiKey = process.env.CF_AIG_TOKEN?.trim();

    if (!accountId || !apiKey) return null;

    return { accountId, gateway, apiKey };
  } catch {
    return null;
  }
}


