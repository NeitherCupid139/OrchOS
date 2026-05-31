import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { isClerkConfigured } from "@/lib/auth";
import { Pricing } from "@/components/pricing/Pricing";
import { PricingWithAuth } from "@/components/pricing/PricingWithAuth";

export const Route = createFileRoute("/pricing")({
  component: PricingRoute,
});

function PricingRoute() {
  if (!isClerkConfigured()) {
    return <Pricing isSignedIn={false} />;
  }

  return (
    <AuthProvider>
      <PricingWithAuth />
    </AuthProvider>
  );
}
