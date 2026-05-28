import { useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AsciiLoading } from "@/components/ui/ascii-loading";
import { loading } from "@/paraglide/messages";

export const Route = createFileRoute("/sso-callback")({
  component: SSOCallbackPage,
});

function SSOCallbackPage() {
  return (
    <AuthProvider>
      <SSOCallbackPageInner />
    </AuthProvider>
  );
}

function SSOCallbackPageInner() {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    if (isSignedIn) {
      sessionStorage.setItem("orch_auth_transition", "true");
    }

    void navigate({
      to: isSignedIn ? "/dashboard/creation" : "/sign-in",
      replace: true,
    });
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <AsciiLoading label={loading()} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <AsciiLoading label={loading()} />
    </div>
  );
}
