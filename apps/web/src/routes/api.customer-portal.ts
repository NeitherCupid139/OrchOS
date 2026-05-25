import { createFileRoute } from "@tanstack/react-router";
import { CustomerPortal } from "@dodopayments/tanstack";

function createPortalHandler() {
  const handler = CustomerPortal({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY ?? "",
    environment: (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ?? "test_mode",
  });

  return async (request: Request): Promise<Response> => {
    const result = await (handler as unknown as (req: Request) => Promise<Response>)(request);
    return new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers: result.headers,
    });
  };
}

export const Route = createFileRoute("/api/customer-portal")({
  server: {
    handlers: {
      GET: async ({ request }) => createPortalHandler()(request),
    },
  },
});
