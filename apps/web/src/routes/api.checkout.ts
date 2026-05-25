import { createFileRoute } from "@tanstack/react-router";
import { Checkout } from "@dodopayments/tanstack";

function createCheckoutHandler() {
  const handler = Checkout({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY ?? "",
    returnUrl: process.env.DODO_PAYMENTS_RETURN_URL ?? "/dashboard",
    environment: (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ?? "test_mode",
  });

  return async (request: Request): Promise<Response> => {
    const result = await (handler as unknown as (req: Request) => Promise<Response>)(request);
    // Reconstruct to ensure type compatibility with CF Workers
    return new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers: result.headers,
    });
  };
}

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      GET: async ({ request }) => createCheckoutHandler()(request),
      POST: async ({ request }) => createCheckoutHandler()(request),
    },
  },
});
