import { useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AuthPage } from "@/components/ui/auth-page";
import { AsciiLoading } from "@/components/ui/ascii-loading";
import { SignUpForm } from "@/components/ui/auth-forms";
import { isClerkConfigured } from "@/lib/auth";
import { have_account, loading, not_configured_sign_up, not_configured_title, sign_in } from "@/paraglide/messages";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <AuthProvider>
      <SignUpPageInner />
    </AuthProvider>
  );
}

function SignUpPageInner() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    sessionStorage.setItem("orch_auth_transition", "true");
    void navigate({ to: "/dashboard/creation", replace: true });
  }, [isSignedIn, navigate]);

  if (!isClerkConfigured()) {
    return (
      <AuthPage mode="signUp">
        <MissingClerkConfig />
      </AuthPage>
    );
  }

  if (isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <AsciiLoading label={loading()} />
      </div>
    );
  }

  return (
    <>
      <AuthPage mode="signUp">
        <SignUpForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {have_account()}{" "}
          <Link to="/sign-in" className="font-medium text-primary hover:underline">
            {sign_in()}
          </Link>
        </p>
      </AuthPage>
    </>
  );
}

function MissingClerkConfig() {
  return (
    <div className="rounded-[calc(var(--radius-xl)*1.2)] border border-dashed border-border bg-muted/40 p-6">
      <p className="text-sm font-semibold text-foreground">{not_configured_title()}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {not_configured_sign_up()}
      </p>
    </div>
  );
}
