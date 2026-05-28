/**
 * Built-in default agent configuration.
 *
 * This agent is available to all users (Free and Pro).
 * The difference is usage limits enforced by the credits system (in @orchos/pro).
 *
 * The built-in agent uses Cloudflare AI Gateway in BYOK (Bring Your Own Key) mode.
 * The gateway handles authentication with the AI provider — no provider API key
 * needs to be configured in the application.
 *
 * The CF AI Gateway config comes from wrangler env vars:
 *   CF_AI_GATEWAY_ACCOUNT_ID
 *   CF_AI_GATEWAY_NAME (default: "default")
 *   CF_AI_GATEWAY_API_KEY
 */

const BUILTIN_AGENT_ID = "__builtin__" as const;

export interface BuiltInAgent {
  id: typeof BUILTIN_AGENT_ID;
  name: string;
  /** In BYOK mode, url is not needed — gateway handles routing */
  url: string;
  model: string;
  /** Built-in agents cannot be deleted or edited */
  readonly: true;
  /** Label shown in the agent list */
  badge: "Built-in";
}

export function getBuiltInAgent(): BuiltInAgent {
  return {
    id: BUILTIN_AGENT_ID,
    name: "OrchOS Agent",
    url: "",
    model: "deepseek-v4-flash",
    readonly: true,
    badge: "Built-in",
  };
}

export function isBuiltInAgent(id: string): boolean {
  return id === BUILTIN_AGENT_ID;
}
