export interface PublicRuntimeConfig {
  clerkPublishableKey: string;
  enableWebsocket: boolean;
  turnstileSiteKey: string;
  builtinAgentUrl?: string;
}

declare global {
  interface Window {
    __ORCHOS_PUBLIC_CONFIG__?: PublicRuntimeConfig;
  }
}

function readBoolean(value: string | undefined) {
  if (!value) return false;

  switch (value.trim().toLowerCase()) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    default:
      return false;
  }
}

function getFallbackConfig(): PublicRuntimeConfig {
  return {
    clerkPublishableKey: "",
    enableWebsocket: false,
    turnstileSiteKey: "",
    builtinAgentUrl: undefined,
  };
}

function readServerPublicRuntimeConfig(): PublicRuntimeConfig {
  return {
    clerkPublishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY?.trim() ?? "",
    enableWebsocket: readBoolean(process.env.ENABLE_WEBSOCKET),
    turnstileSiteKey: process.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "",
    builtinAgentUrl: process.env.PUBLIC_BUILTIN_AGENT_URL?.trim() || undefined,
  };
}

export function getPublicRuntimeConfig(): PublicRuntimeConfig {
  if (typeof window !== "undefined") {
    return window.__ORCHOS_PUBLIC_CONFIG__ ?? getFallbackConfig();
  }

  return readServerPublicRuntimeConfig();
}
