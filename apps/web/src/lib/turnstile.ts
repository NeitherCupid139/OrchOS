import { getPublicRuntimeConfig } from "./public-runtime-config";

/**
 * Returns the Cloudflare Turnstile site key from public runtime config.
 * Returns an empty string if not configured, which disables the widget.
 */
export function getTurnstileSiteKey(): string {
  return getPublicRuntimeConfig().turnstileSiteKey;
}

/**
 * Server-side Turnstile token verification.
 * Calls Cloudflare's siteverify endpoint.
 */
export async function verifyTurnstileToken(
  token: string,
  secretKey: string,
): Promise<{ success: boolean; error?: string }> {
  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);

  const result = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
    },
  );

  if (!result.ok) {
    return { success: false, error: `HTTP ${result.status}` };
  }

  const data = (await result.json()) as {
    success: boolean;
    "error-codes"?: string[];
  };

  return {
    success: data.success,
    error: data["error-codes"]?.join(", "),
  };
}
