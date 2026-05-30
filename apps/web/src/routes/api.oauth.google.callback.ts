import { createFileRoute } from "@tanstack/react-router";
import { IntegrationService } from "@/server/modules/integration/service";
import { getLocalDb } from "@/server/runtime/local-db";

/**
 * Google OAuth 2.0 callback handler.
 *
 * Google redirects here after the user authorizes (or denies) the app.
 * We exchange the authorization code for tokens and store the integration.
 */
export const Route = createFileRoute("/api/oauth/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        // Handle user cancellation or Google errors
        if (error) {
          const redirect = getAppRedirect(request);
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${redirect}?oauth_error=${encodeURIComponent(error)}`,
              "Set-Cookie": "orch_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
            },
          });
        }

        if (!code) {
          return new Response("Missing authorization code.", { status: 400 });
        }

        // Validate state to prevent CSRF
        const stateValidation = validateState(request, state);
        if (!stateValidation.ok) {
          return new Response(stateValidation.error || "Invalid state parameter.", { status: 400 });
        }

        const { type, redirect: appRedirect } = stateValidation;

        try {
          const db = await getLocalDb();
          const service = new IntegrationService(db);

          const callbackUrl = `${url.origin}/api/oauth/google/callback`;
          await service.connectGoogleWithAuthCode(type, code, callbackUrl);

          return new Response(null, {
            status: 302,
            headers: {
              Location: appRedirect,
              "Set-Cookie": "orch_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "OAuth connection failed";
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${appRedirect}?oauth_error=${encodeURIComponent(message)}`,
              "Set-Cookie": "orch_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
            },
          });
        }
      },
    },
  },
});

/**
 * Extract the original app redirect URL from the oauth state cookie.
 * Falls back to /dashboard if the cookie is missing or invalid.
 */
function getAppRedirect(request: Request): string {
  try {
    const parsed = parseStateCookie(request);
    return parsed?.redirect || "/dashboard";
  } catch {
    return "/dashboard";
  }
}

/**
 * Validate the OAuth state parameter against the cookie and extract the
 * integration type + redirect URL. Returns { ok: false } if validation fails.
 */
function validateState(
  request: Request,
  state: string | null,
): { ok: true; type: "google-calendar" | "gmail"; redirect: string } | { ok: false; error?: string } {
  if (!state) {
    return { ok: false, error: "Missing state parameter." };
  }

  const parsed = parseStateCookie(request);
  if (!parsed) {
    return { ok: false, error: "Missing or expired OAuth session. Please try again." };
  }

  if (parsed.state !== state) {
    return { ok: false, error: "State mismatch. Possible CSRF attack." };
  }

  if (parsed.type !== "google-calendar" && parsed.type !== "gmail") {
    return { ok: false, error: "Invalid integration type in OAuth session." };
  }

  return { ok: true, type: parsed.type, redirect: parsed.redirect };
}

interface StatePayload {
  type: string;
  redirect: string;
  state: string;
}

function parseStateCookie(request: Request): StatePayload | null {
  try {
    const cookieHeader = request.headers.get("Cookie") ?? "";
    const cookies = cookieHeader.split(";").reduce(
      (acc, part) => {
        const eqIdx = part.indexOf("=");
        if (eqIdx > 0) {
          const key = part.slice(0, eqIdx).trim();
          const value = part.slice(eqIdx + 1).trim();
          if (key && value) acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    const raw = cookies["orch_oauth_state"];
    if (!raw) return null;

    const json = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as StatePayload;
  } catch {
    return null;
  }
}
