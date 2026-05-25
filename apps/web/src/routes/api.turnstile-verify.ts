import { createFileRoute } from "@tanstack/react-router";
import { verifyTurnstileToken } from "@/lib/turnstile";

async function handleTurnstileVerify({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const secretKey = (process.env.TURNSTILE_SECRET_KEY ?? "").trim();
  if (!secretKey) {
    return Response.json(
      { success: false, error: "Turnstile not configured on server" },
      { status: 500 },
    );
  }

  let body: { token?: string };
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = body?.token;
  if (!token || typeof token !== "string") {
    return Response.json(
      { success: false, error: "Missing or invalid token" },
      { status: 400 },
    );
  }

  const result = await verifyTurnstileToken(token, secretKey);

  return Response.json(result, {
    status: result.success ? 200 : 400,
  });
}

export const Route = createFileRoute("/api/turnstile-verify")({
  server: {
    handlers: {
      POST: handleTurnstileVerify,
    },
  },
});
