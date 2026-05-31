import { useUser } from "@clerk/clerk-react";
import { Pricing } from "./Pricing";

export function PricingWithAuth() {
  const { isSignedIn } = useUser();
  return <Pricing isSignedIn={Boolean(isSignedIn)} />;
}
