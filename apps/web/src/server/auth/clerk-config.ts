export interface ClerkServerAuthConfig {
  jwtKey: string;
  secretKey: string;
}

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getClerkServerAuthConfig(): ClerkServerAuthConfig {
  return {
    jwtKey: readEnv("CLERK_JWT_KEY"),
    secretKey: readEnv("CLERK_SECRET_KEY"),
  };
}

export function isClerkServerAuthConfigured(config: ClerkServerAuthConfig): boolean {
  return config.jwtKey.length > 0 || config.secretKey.length > 0;
}

export function getClerkVerifyTokenOptions(config: ClerkServerAuthConfig) {
  // Prefer networkless verification when a JWT public key is configured.
  if (config.jwtKey) {
    return { jwtKey: config.jwtKey };
  }

  if (config.secretKey) {
    return { secretKey: config.secretKey };
  }

  return {};
}
