/**
 * AI Model Provider Layer
 *
 * Provides a unified `createModelFromAgent` function that creates Vercel AI SDK
 * language models from agent configuration, with optional Cloudflare AI Gateway
 * routing for observability, caching, and rate limiting.
 *
 * ## BYOK (Bring Your Own Key) Mode
 *
 * When the gateway is configured and no custom agent URL/API key is provided,
 * the function uses the unified provider pattern:
 *
 *   aigateway(unified("deepseek/deepseek-chat"))
 *
 * CF AI Gateway handles authentication, routing, and billing — no provider
 * API key is needed. This is the recommended pattern for the built-in agent.
 *
 * ## Custom Agent Mode
 *
 * When a custom agent URL and API key are provided alongside the gateway config,
 * the API URL is rewritten to route through Cloudflare AI Gateway:
 *
 *   original: https://api.openai.com/v1/chat/completions
 *   gateway:  https://gateway.ai.cloudflare.com/v1/{accountId}/{gateway}/v1/chat/completions
 *
 * Both the provider API key (Authorization) and gateway API key
 * (cf-aig-authorization) are forwarded.
 *
 * ## Direct Mode
 *
 * When no gateway config is provided, calls go directly to the provider
 * via the OpenAI-compatible SDK.
 */

import { createAiGateway } from "ai-gateway-provider";
import { createUnified } from "ai-gateway-provider/providers/unified";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import type { AIGatewayConfig } from "@orchos/pro/ai-gateway";

// ─── Types ────────────────────────────────────────────────────────────────

export interface CreateModelFromAgentInput {
  /**
   * Base URL of the AI provider API (e.g., "https://api.openai.com/v1").
   * Optional in BYOK mode.
   */
  url?: string;

  /**
   * API key for the AI provider.
   * Optional in BYOK mode (gateway handles auth/billing).
   */
  apiKey?: string;

  /**
   * Model identifier (e.g., "gpt-4", "deepseek/deepseek-chat",
   * "anthropic/claude-sonnet-4").
   */
  model: string;

  /**
   * Cloudflare AI Gateway configuration.
   * When provided, requests are routed through the gateway.
   */
  gatewayConfig?: AIGatewayConfig | null;
}

// ─── Singleton Gateway Instance ───────────────────────────────────────────

let cachedAiGateway: ReturnType<typeof createAiGateway> | null = null;
let cachedGatewayKey: string | null = null;

/**
 * Returns a cached Cloudflare AI Gateway provider wrapper.
 * Reuses the wrapper when config values match to avoid recreation.
 */
function getAiGateway(
  config: AIGatewayConfig,
): ReturnType<typeof createAiGateway> {
  const key = `${config.accountId}:${config.gateway}:${config.apiKey}`;
  if (cachedAiGateway && cachedGatewayKey === key) {
    return cachedAiGateway;
  }
  cachedAiGateway = createAiGateway({
    accountId: config.accountId,
    gateway: config.gateway,
    apiKey: config.apiKey,
  });
  cachedGatewayKey = key;
  return cachedAiGateway;
}

// ─── createModelFromAgent ─────────────────────────────────────────────────

/**
 * Create a Vercel AI SDK language model from agent connection settings.
 *
 * @example
 * ```ts
 * // BYOK mode — gateway handles auth, no provider API key needed
 * const model = await createModelFromAgent({
 *   model: "deepseek/deepseek-chat",
 *   gatewayConfig: { accountId, gateway, apiKey },
 * });
 *
 * // Custom agent through gateway
 * const model = await createModelFromAgent({
 *   url: "https://api.openai.com/v1",
 *   apiKey: process.env.OPENAI_API_KEY,
 *   model: "gpt-4",
 *   gatewayConfig: { accountId, gateway, apiKey },
 * });
 *
 * // Direct mode — no gateway
 * const model = await createModelFromAgent({
 *   url: "https://api.openai.com/v1",
 *   apiKey: process.env.OPENAI_API_KEY,
 *   model: "gpt-4",
 * });
 * ```
 */
export async function createModelFromAgent(
  input: CreateModelFromAgentInput,
): Promise<LanguageModelV3> {
  const { url, apiKey, model, gatewayConfig } = input;

  // ── BYOK (Bring Your Own Key) Mode ────────────────────────────────────
  //
  // Gateway is configured, but no custom agent URL or API key is provided.
  // Uses the unified provider pattern:
  //
  //   aigateway(unified("model-name"))
  //
  // CF AI Gateway handles:
  //   - Authentication (via CF_AIG_TOKEN / gateway API key)
  //   - Provider routing (based on model prefix like "deepseek/")
  //   - Billing / usage tracking
  //   - Caching, rate limiting, observability
  //
  if (gatewayConfig && (!url || !apiKey)) {
    const aigateway = getAiGateway(gatewayConfig);
    const unified = createUnified();
    return aigateway(unified(model));
  }

  // ── Custom Agent Through Gateway ──────────────────────────────────────
  //
  // Custom agent with its own URL and API key, but routed through
  // Cloudflare AI Gateway for observability, caching, and rate limiting.
  //
  // The original API URL is rewritten to route through the gateway:
  //   original:  https://api.openai.com/v1
  //   gateway:   https://gateway.ai.cloudflare.com/v1/{accountId}/{gateway}
  //
  // Both the provider API key (Authorization header) and the gateway API key
  // (cf-aig-authorization header) are forwarded.
  //
  if (gatewayConfig && url) {
    const gatewayBase =
      `https://gateway.ai.cloudflare.com/v1/${gatewayConfig.accountId}/${gatewayConfig.gateway}`;
    const gatewayUrl = url.replace(/^https?:\/\/[^/]+/, gatewayBase);

    const provider = createOpenAICompatible({
      baseURL: gatewayUrl,
      name: "OpenAICompatible",
      apiKey: apiKey ?? undefined,
      headers: {
        "cf-aig-authorization": `Bearer ${gatewayConfig.apiKey}`,
      },
    });

    return provider.chatModel(model);
  }

  // ── Direct Mode (No Gateway) ──────────────────────────────────────────
  //
  // Call the AI provider directly without Cloudflare AI Gateway.
  // Uses the OpenAI-compatible SDK provider pointing to the custom URL.
  //
  const provider = createOpenAICompatible({
    baseURL: url ?? "https://api.openai.com/v1",
    name: "OpenAICompatible",
    apiKey: apiKey ?? undefined,
  });

  return provider.chatModel(model);
}
