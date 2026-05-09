import { useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AuthPage } from "@/components/ui/auth-page";
import { AsciiLoading } from "@/components/ui/ascii-loading";
import { SignInForm } from "@/components/ui/auth-forms";
import { isClerkConfigured } from "@/lib/auth";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  return (
    <AuthProvider>
      <SignInPageInner />
    </AuthProvider>
  );
}

function SignInPageInner() {
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
      <AuthPage mode="signIn">
        <MissingClerkConfig />
      </AuthPage>
    );
  }

  if (isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <AsciiLoading label={m.loading()} />
      </div>
    );
  }

  return (
    <>
      <AuthPage mode="signIn">
        <SignInForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {m.no_account()}{" "}
          <Link to="/sign-up" className="font-medium text-primary hover:underline">
            {m.sign_up()}
          </Link>
        </p>
      </AuthPage>
    </>
  );
}

function MissingClerkConfig() {
  return (
    <div className="rounded-[calc(var(--radius-xl)*1.2)] border border-dashed border-border bg-muted/40 p-6">
      <p className="text-sm font-semibold text-foreground">{m.not_configured_title()}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {m.not_configured_sign_in()}
      </p>
    </div>
  );
}
