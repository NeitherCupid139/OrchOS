import { createFileRoute } from "@tanstack/react-router";
import { Checkout } from "@dodopayments/tanstack";
import { authenticateORPCRequest } from "@/server/orpc/context";

const PRO_PRODUCT_IDS = {
  monthly:
    process.env.DODO_PAYMENTS_PRO_MONTHLY_PRODUCT_ID ??
    process.env.DODO_PAYMENTS_PRO_PRODUCT_ID ??
    process.env.DODO_PAYMENTS_PRODUCT_ID ??
    "",
  yearly: process.env.DODO_PAYMENTS_PRO_YEARLY_PRODUCT_ID ?? "",
};

type ProBillingInterval = keyof typeof PRO_PRODUCT_IDS;

function getBillingInterval(value: string | null): ProBillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

function getBillingIntervalForProductId(
  productId: string,
): ProBillingInterval | null {
  if (PRO_PRODUCT_IDS.monthly && productId === PRO_PRODUCT_IDS.monthly) {
    return "monthly";
  }
  if (PRO_PRODUCT_IDS.yearly && productId === PRO_PRODUCT_IDS.yearly) {
    return "yearly";
  }
  return null;
}

function createCheckoutHandler() {
  const handler = Checkout({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY ?? "",
    returnUrl: process.env.DODO_PAYMENTS_RETURN_URL ?? "/dashboard",
    environment:
      (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ??
      "test_mode",
    type: "static",
  });

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const requestedProductId = url.searchParams.get("productId");
    const requestedBilling = getBillingInterval(
      url.searchParams.get("billing"),
    );
    const billing =
      requestedProductId !== null
        ? getBillingIntervalForProductId(requestedProductId)
        : requestedBilling;
    const productId = billing ? PRO_PRODUCT_IDS[billing] : "";

    if (requestedProductId && !billing) {
      return new Response("Only Pro checkout is enabled.", { status: 400 });
    }

    if (!productId) {
      return new Response(
        `Pro ${requestedBilling} checkout is not configured.`,
        { status: 500 },
      );
    }

    url.searchParams.set("productId", productId);
    url.searchParams.set("quantity", "1");
    url.searchParams.set("metadata_plan", "pro");
    url.searchParams.set("metadata_billing", billing ?? requestedBilling);

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
