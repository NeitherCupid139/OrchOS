import { authenticateRequest } from "@/server/auth/request-auth";
import { getClerkServerAuthConfig, isClerkServerAuthConfigured } from "@/server/auth/clerk-config";

export interface ORPCContext {
  request: Request;
  headers: Headers;
}

export function isClerkConfigured() {
  return isClerkServerAuthConfigured(getClerkServerAuthConfig());
}

export async function authenticateORPCRequest(request: Request) {
  return authenticateRequest(request, getClerkServerAuthConfig());
}

export function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("Authorization")?.trim();
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}
