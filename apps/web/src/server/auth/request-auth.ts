import { verifyToken } from "@clerk/backend";

import {
  getClerkVerifyTokenOptions,
  isClerkServerAuthConfigured,
  type ClerkServerAuthConfig,
} from "./clerk-config";

export interface AuthContext {
  userId: string | null;
  orgId: string | null;
  sessionId: string | null;
}

function extractSessionToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookieHeader = request.headers.get("Cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === "__session") {
      return rest.join("=");
    }
  }

  return null;
}

export async function authenticateRequest(request: Request, config: ClerkServerAuthConfig): Promise<AuthContext> {
  if (!isClerkServerAuthConfigured(config)) {
    return { userId: null, orgId: null, sessionId: null };
  }

  const token = extractSessionToken(request);
  if (!token) {
    return { userId: null, orgId: null, sessionId: null };
  }

  try {
    const claims = await verifyToken(token, getClerkVerifyTokenOptions(config));
    return {
      userId: claims.sub ?? null,
      orgId: (claims.org_id as string | undefined) ?? null,
      sessionId: (claims.sid as string | undefined) ?? null,
    };
  } catch {
    return { userId: null, orgId: null, sessionId: null };
  }
}
