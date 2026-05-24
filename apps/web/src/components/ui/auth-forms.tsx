import { useRef, useState } from "react";
import { useSignIn, useSignUp } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  auth_apple_button,
  auth_email_placeholder,
  auth_google_button,
  auth_or_divider,
  auth_passwords_mismatch,
  auth_sign_in_error,
  auth_sign_up_error,
  auth_unexpected_error,
  auth_verification_code_label,
  auth_verification_code_placeholder,
  auth_verification_code_sent,
  auth_verification_failed,
  auth_verify_button,
  confirm as confirm_label,
  email as email_label,
  loading as loading_label,
  password as password_label,
  sign_in,
  sign_up,
} from "@/paraglide/messages";

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4", className)} aria-hidden="true">
      <g transform="scale(1.15) translate(-1.3, -1.3)">
        <path
          d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function SignInForm() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isLoaded) return null;

  const handleOAuth = (strategy: "oauth_google" | "oauth_apple") => {
    signIn.authenticateWithRedirect({
      strategy,
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/dashboard/creation",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn.create({ identifier: email, password });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
      } else {
        setError(auth_sign_in_error());
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : auth_unexpected_error();
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      <div className="grid gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth("oauth_google")}
        >
          <GoogleIcon />
          {auth_google_button()}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth("oauth_apple")}
        >
          <AppleIcon className="size-4" />
          {auth_apple_button()}
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">{auth_or_divider()}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset className="space-y-1.5">
          <label
            htmlFor="sign-in-email"
            className="text-sm font-medium text-foreground"
          >
            {email_label()}
          </label>
          <Input
            id="sign-in-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={auth_email_placeholder()}
            autoComplete="email"
            required
          />
        </fieldset>

        <fieldset className="space-y-1.5">
          <label
            htmlFor="sign-in-password"
            className="text-sm font-medium text-foreground"
          >
            {password_label()}
          </label>
          <Input
            id="sign-in-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </fieldset>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? loading_label() : sign_in()}
        </Button>
      </form>
    </div>
  );
}

export function SignUpForm() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const verifyingRef = useRef(false);
  const [code, setCode] = useState("");

  if (!isLoaded) return null;

  const handleOAuth = (strategy: "oauth_google" | "oauth_apple") => {
    signUp.authenticateWithRedirect({
      strategy,
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/dashboard/creation",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(auth_passwords_mismatch());
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
      });

      if (
        result.status === "missing_requirements" &&
        result.verifications?.emailAddress
      ) {
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        verifyingRef.current = true;
      } else if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
      } else {
        setError(auth_sign_up_error());
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : auth_unexpected_error();
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
      } else {
        setError(auth_verification_failed());
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : auth_unexpected_error();
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (verifyingRef.current) {
    return (
      <form onSubmit={handleVerify} className="w-full space-y-4">
        <p className="text-sm text-muted-foreground">
          {auth_verification_code_sent({ email })}
        </p>

        <fieldset className="space-y-1.5">
          <label
            htmlFor="sign-up-code"
            className="text-sm font-medium text-foreground"
          >
            {auth_verification_code_label()}
          </label>
          <Input
            id="sign-up-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={auth_verification_code_placeholder()}
            required
          />
        </fieldset>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? loading_label() : auth_verify_button()}
        </Button>
      </form>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div className="grid gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth("oauth_google")}
        >
          <GoogleIcon />
          {auth_google_button()}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth("oauth_apple")}
        >
          <AppleIcon className="size-4" />
          {auth_apple_button()}
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">{auth_or_divider()}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset className="space-y-1.5">
          <label
            htmlFor="sign-up-email"
            className="text-sm font-medium text-foreground"
          >
            {email_label()}
          </label>
          <Input
            id="sign-up-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={auth_email_placeholder()}
            autoComplete="email"
            required
          />
        </fieldset>

        <fieldset className="space-y-1.5">
          <label
            htmlFor="sign-up-password"
            className="text-sm font-medium text-foreground"
          >
            {password_label()}
          </label>
          <Input
            id="sign-up-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </fieldset>

        <fieldset className="space-y-1.5">
          <label
            htmlFor="sign-up-confirm"
            className="text-sm font-medium text-foreground"
          >
            {confirm_label()}
          </label>
          <Input
            id="sign-up-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </fieldset>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? loading_label() : sign_up()}
        </Button>
      </form>
    </div>
  );
}
