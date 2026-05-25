/**
 * Built-in default agent configuration.
 *
 * This agent is available to all users (Free and Pro).
 * The difference is usage limits enforced by the credits system (in @orchos/pro).
 *
 * The API endpoint comes from PUBLIC_BUILTIN_AGENT_URL (wrangler env var)
 * or window.__ORCHOS_PUBLIC_CONFIG__.builtinAgentUrl on the client side.
 */

import { getPublicRuntimeConfig } from "@/lib/public-runtime-config";

const BUILTIN_AGENT_ID = "__builtin__" as const;

export interface BuiltInAgent {
  id: typeof BUILTIN_AGENT_ID;
  name: string;
  url: string;
  model: string;
  /** Built-in agents cannot be deleted or edited */
  readonly: true;
  /** Label shown in the agent list */
  badge: "Built-in";
}

export function getBuiltInAgent(): BuiltInAgent {
  let url: string;

  if (typeof window !== "undefined") {
    // Client-side: read from public runtime config
    url =
      getPublicRuntimeConfig().builtinAgentUrl ?? "https://api.orchos.dev/v1";
  } else {
    // Server-side: read from env var
    url =
      typeof process !== "undefined" && process.env.PUBLIC_BUILTIN_AGENT_URL
        ? process.env.PUBLIC_BUILTIN_AGENT_URL
        : "https://api.orchos.dev/v1";
  }

  return {
    id: BUILTIN_AGENT_ID,
    name: "OrchOS Agent",
    url,
    model: "gemini-2.5-pro",
    readonly: true,
    badge: "Built-in",
  };
}

export function isBuiltInAgent(id: string): boolean {
  return id === BUILTIN_AGENT_ID;
}
