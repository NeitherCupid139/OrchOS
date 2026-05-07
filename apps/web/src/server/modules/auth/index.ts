import { Elysia } from "elysia";
import { status } from "elysia";
import { authenticateRequest, type AuthContext } from "../../auth/request-auth";
import {
  getClerkServerAuthConfig,
  isClerkServerAuthConfigured,
  type ClerkServerAuthConfig,
} from "../../auth/clerk-config";

export function createAuthPlugin(config: ClerkServerAuthConfig = getClerkServerAuthConfig()) {
  const isClerkConfigured = isClerkServerAuthConfigured(config);

  return new Elysia({ name: "auth" })
    .derive({ as: "global" }, async ({ request }): Promise<{ auth: AuthContext }> => {
      const auth = await authenticateRequest(request, config);
      return { auth };
    })
    .macro(({ onBeforeHandle }) => ({
      requireAuth(enabled: boolean) {
        if (!enabled) return;
        onBeforeHandle(({ auth }: { auth: AuthContext }) => {
          if (!isClerkConfigured) return;
          if (!auth.userId) throw status(401, "Unauthorized");
        });
      },
    }));
}
