import { createFileRoute } from "@tanstack/react-router";
import { Webhooks } from "@dodopayments/tanstack";
import { getLocalDb } from "@/server/runtime/local-db";
import { subscriptions, creditUsage } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/server/utils";

function getUserId(payload: Record<string, unknown>): string | null {
  const metadata = payload.metadata as Record<string, unknown> | undefined;
  if (metadata?.userId && typeof metadata.userId === "string") return metadata.userId;
  if (metadata?.user_id && typeof metadata.user_id === "string") return metadata.user_id;
  return null;
}

function getCreditsFromPayload(payload: Record<string, unknown>): number {
  if (typeof payload.amount === "number") return payload.amount;
  if (typeof payload.credits === "number") return payload.credits;
  return 0;
}

function createWebhookHandler() {
  const handler = Webhooks({
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY ?? "",

    onSubscriptionActive: async (payload) => {
      const userId = getUserId(payload as Record<string, unknown>);
      if (!userId) return;

      const db = await getLocalDb();
      const now = new Date().toISOString();
      const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).get();

      if (existing) {
        await db.update(subscriptions).set({ plan: "pro", status: "active", updatedAt: now }).where(eq(subscriptions.userId, userId)).run();
      } else {
        await db.insert(subscriptions).values({ userId, plan: "pro", creditsBalance: "1000", creditsTotal: "1000", tokensUsed: "0", status: "active", createdAt: now, updatedAt: now }).run();
      }
    },

    onSubscriptionCancelled: async (payload) => {
      const userId = getUserId(payload as Record<string, unknown>);
      if (!userId) return;
      const db = await getLocalDb();
      await db.update(subscriptions).set({ status: "cancelled", updatedAt: new Date().toISOString() }).where(eq(subscriptions.userId, userId)).run();
    },

    onSubscriptionExpired: async (payload) => {
      const userId = getUserId(payload as Record<string, unknown>);
      if (!userId) return;
      const db = await getLocalDb();
      await db.update(subscriptions).set({ plan: "free", status: "expired", creditsBalance: "100", creditsTotal: "100", updatedAt: new Date().toISOString() }).where(eq(subscriptions.userId, userId)).run();
    },

    onCreditAdded: async (payload) => {
      const userId = getUserId(payload as Record<string, unknown>);
      if (!userId) return;
      const credits = getCreditsFromPayload(payload as Record<string, unknown>);
      if (credits <= 0) return;

      const db = await getLocalDb();
      const now = new Date().toISOString();
      const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).get();
      if (existing) {
        await db.update(subscriptions).set({ creditsBalance: String(Number(existing.creditsBalance) + credits), creditsTotal: String(Number(existing.creditsTotal) + credits), updatedAt: now }).where(eq(subscriptions.userId, userId)).run();
      }
      await db.insert(creditUsage).values({ id: generateId("crd"), userId, action: "credit_purchase", tokens: "0", credits: String(credits), metadata: JSON.stringify({ source: "dodo_payments", event: "credit_added" }), createdAt: now }).run();
    },

    onCreditDeducted: async (payload) => {
      const userId = getUserId(payload as Record<string, unknown>);
      if (!userId) return;
      const credits = getCreditsFromPayload(payload as Record<string, unknown>);
      if (credits <= 0) return;

      const db = await getLocalDb();
      const now = new Date().toISOString();
      const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).get();
      if (existing) {
        await db.update(subscriptions).set({ creditsBalance: String(Math.max(0, Number(existing.creditsBalance) - credits)), updatedAt: now }).where(eq(subscriptions.userId, userId)).run();
      }
      await db.insert(creditUsage).values({ id: generateId("crd"), userId, action: "credit_usage", tokens: "0", credits: String(credits), metadata: JSON.stringify({ source: "dodo_payments", event: "credit_deducted" }), createdAt: now }).run();
    },

    onPaymentSucceeded: async (payload) => {
      const userId = getUserId(payload as Record<string, unknown>);
      if (!userId) return;

      const data = payload as Record<string, unknown>;
      const metadata = data.metadata as Record<string, unknown> | undefined;
      if (metadata?.credit_purchase) {
        const creditsAmount = typeof metadata.credits === "number" ? metadata.credits : 0;
        if (creditsAmount <= 0) return;

        const db = await getLocalDb();
        const now = new Date().toISOString();
        const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).get();
        if (existing) {
          await db.update(subscriptions).set({ creditsBalance: String(Number(existing.creditsBalance) + creditsAmount), creditsTotal: String(Number(existing.creditsTotal) + creditsAmount), updatedAt: now }).where(eq(subscriptions.userId, userId)).run();
        }
        await db.insert(creditUsage).values({ id: generateId("crd"), userId, action: "credit_purchase", tokens: "0", credits: String(creditsAmount), metadata: JSON.stringify({ source: "dodo_payments", event: "payment_succeeded" }), createdAt: now }).run();
      }
    },
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

export const Route = createFileRoute("/api/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => createWebhookHandler()(request),
    },
  },
});
