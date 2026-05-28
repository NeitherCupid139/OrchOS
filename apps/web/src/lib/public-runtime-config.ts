export interface PublicRuntimeConfig {
  clerkPublishableKey: string;
  turnstileSiteKey: string;
}

declare global {
  interface Window {
    __ORCHOS_PUBLIC_CONFIG__?: PublicRuntimeConfig;
  }
}

function getFallbackConfig(): PublicRuntimeConfig {
  return {
    clerkPublishableKey: "",
    turnstileSiteKey: "",
  };
}

function readServerPublicRuntimeConfig(): PublicRuntimeConfig {
  return {
    clerkPublishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY?.trim() ?? "",
    turnstileSiteKey: process.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "",
  };
}

export function getPublicRuntimeConfig(): PublicRuntimeConfig {
  if (typeof window !== "undefined") {
    return window.__ORCHOS_PUBLIC_CONFIG__ ?? getFallbackConfig();
  }

  return readServerPublicRuntimeConfig();
}
