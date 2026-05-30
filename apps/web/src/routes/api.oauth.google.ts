import { createFileRoute } from "@tanstack/react-router";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

/**
 * Initiate Google OAuth 2.0 Authorization Code flow.
 *
 * Query params:
 *   - type: "gmail" (required)
 *   - redirect: URL to redirect back to after success (optional, defaults to /dashboard)
 *
 * The user is redirected to Google's consent screen. After authorization,
 * Google redirects to /api/oauth/google/callback, which exchanges the code
 * for tokens and stores the integration.
 */
export const Route = createFileRoute("/api/oauth/google")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const type = url.searchParams.get("type");
        const appRedirect = url.searchParams.get("redirect") || "/dashboard";

        if (type !== "gmail") {
          return new Response("Missing or invalid 'type' parameter. Must be 'gmail'.", {
            status: 400,
          });
        }

        const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID ?? "").trim();
        const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "").trim();

        if (!clientId || !clientSecret) {
          return new Response(
            "Google OAuth is not configured on this server. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.",
            { status: 500 },
          );
        }

        // Scopes required for Gmail
        const scope = [
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/gmail.send",
        ];

        // Build the callback URL (must match the redirect_uri registered in Google Cloud Console)
        const callbackUrl = `${url.origin}/api/oauth/google/callback`;

        // Generate a CSRF state token
        const stateBytes = new Uint8Array(32);
        crypto.getRandomValues(stateBytes);
        const state = btoa(String.fromCharCode(...stateBytes))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        // Store type + redirect in a short-lived cookie alongside the state
        const statePayload = JSON.stringify({ type, redirect: appRedirect, state });
        const stateCookieValue = btoa(new TextEncoder().encode(statePayload).reduce((acc, byte) => acc + String.fromCharCode(byte), ""))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        // Build Google OAuth URL
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: callbackUrl,
          response_type: "code",
          scope: scope.join(" "),
          access_type: "offline",
          prompt: "consent",
          state,
        });

        const googleAuthUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

        return new Response(null, {
          status: 302,
          headers: {
            Location: googleAuthUrl,
            "Set-Cookie": `orch_oauth_state=${stateCookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
          },
        });
      },
    },
  },
});
