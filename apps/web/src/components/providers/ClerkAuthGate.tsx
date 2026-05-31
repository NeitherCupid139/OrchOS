import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "@tanstack/react-router";
import { isClerkConfigured } from "@/lib/auth";
import { AsciiLoading } from "@/components/ui/ascii-loading";
import { checking_auth } from "@/paraglide/messages";

export function isAuthTransition(): boolean {
  try {
    return sessionStorage.getItem("orch_auth_transition") === "true";
  } catch {
    return false;
  }
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured()) return <>{children}</>;
  return <ClerkAuthGate>{children}</ClerkAuthGate>;
}

function ClerkAuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const hasRedirectedRef = useRef(false);
  const fromAuth = isAuthTransition();

  useEffect(() => {
    if (!isLoaded || isSignedIn || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    void navigate({ to: "/sign-in", replace: true });
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    if (fromAuth) {
      return (
        <div className="relative h-screen overflow-hidden bg-background">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100 blur-xl scale-105"
            style={{ backgroundImage: "url('/hero/background.png')" }}
          />
          <div className="absolute inset-0 bg-background/72 backdrop-blur-[2px]" />
          <div className="relative flex h-full items-center justify-center">
            <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-white/85 shadow-lg backdrop-blur-md">
              <AsciiLoading
                label={checking_auth()}
                className="text-white/85"
                chipClassName="bg-white/10 text-white/85"
                textClassName="text-sm"
              />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <AsciiLoading label="Loading..." />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <AsciiLoading label="Loading..." />
      </div>
    );
  }

  return <>{children}</>;
}
