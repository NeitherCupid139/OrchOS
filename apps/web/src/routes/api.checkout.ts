import { createFileRoute } from "@tanstack/react-router";
import { Checkout } from "@dodopayments/tanstack";
import { authenticateORPCRequest } from "@/server/orpc/context";

const PRO_PRODUCT_ID =
  process.env.DODO_PAYMENTS_PRO_PRODUCT_ID ??
  process.env.DODO_PAYMENTS_PRODUCT_ID ??
  "";

function createCheckoutHandler() {
  const handler = Checkout({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY ?? "",
    returnUrl: process.env.DODO_PAYMENTS_RETURN_URL ?? "/dashboard",
    environment: (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ?? "test_mode",
    type: "static",
  });

  return async (request: Request): Promise<Response> => {
    if (!PRO_PRODUCT_ID) {
      return new Response("Pro checkout is not configured.", { status: 500 });
    }

    const url = new URL(request.url);
    const requestedProductId = url.searchParams.get("productId");

    if (requestedProductId && requestedProductId !== PRO_PRODUCT_ID) {
      return new Response("Only Pro checkout is enabled.", { status: 400 });
    }

    url.searchParams.set("productId", PRO_PRODUCT_ID);
    url.searchParams.set("quantity", "1");
    url.searchParams.set("metadata_plan", "pro");

    const auth = await authenticateORPCRequest(request);
    if (auth?.userId) {
      url.searchParams.set("metadata_userId", auth.userId);
    }

    const checkoutRequest = new Request(url, request);
    const result = await (handler as unknown as (req: Request) => Promise<Response>)(checkoutRequest);
    if (!result.ok) {
      return new Response(result.body, {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
      });
    }

    const body = (await result.json()) as { checkout_url?: string };
    if (!body.checkout_url) {
      return new Response("Checkout URL was not returned.", { status: 502 });
    }

    return Response.redirect(body.checkout_url, 302);
  };
}

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      GET: async ({ request }) => createCheckoutHandler()(request),
      POST: async () =>
        new Response("Only Pro subscription checkout is enabled.", {
          status: 405,
          headers: { Allow: "GET" },
        }),
    },
  },
});
