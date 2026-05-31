import { useEffect, useRef, useCallback } from "react";
import { getTurnstileSiteKey } from "@/lib/turnstile";

// Cloudflare Turnstile script URL
const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  appearance?: "always" | "interaction-only";
}

/**
 * Cloudflare Turnstile widget for bot protection.
 *
 * Usage:
 * ```tsx
 * <TurnstileWidget
 *   onVerify={(token) => setTurnstileToken(token)}
 *   onExpire={() => setTurnstileToken(null)}
 *   onError={() => setTurnstileToken(null)}
 * />
 * ```
 *
 * Requires VITE_TURNSTILE_SITE_KEY in environment variables.
 */
export function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  appearance = "always",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onVerify, onExpire, onError });

  // Keep callbacks ref up to date
  callbacksRef.current = { onVerify, onExpire, onError };

  const siteKey = getTurnstileSiteKey();

  const renderWidget = useCallback(() => {
    const container = containerRef.current;
    if (!container || !siteKey) return;

    if (window.turnstile) {
      widgetIdRef.current = window.turnstile.render(container, {
        sitekey: siteKey,
        appearance,
        callback: (token: string) => callbacksRef.current.onVerify(token),
        "expired-callback": () => callbacksRef.current.onExpire?.(),
        "error-callback": () => callbacksRef.current.onError?.(),
      });
    }
  }, [siteKey, appearance]);

  // react-doctor-disable-next-line react-doctor/exhaustive-deps -- widget id can be assigned asynchronously after script load
  useEffect(() => {
    if (!siteKey) return;

    if (window.turnstile) {
      renderWidget();
      return;
    }

    let cancelled = false;

    // Use the onload callback pattern to auto-render
    const uniqueId = `turnstile-cb-${Math.random().toString(36).slice(2)}`;
    (window as unknown as Record<string, unknown>)[uniqueId] = () => {
      if (cancelled) return;
      renderWidget();
      delete (window as unknown as Record<string, unknown>)[uniqueId];
    };

    const existingScript = document.querySelector(
      `script[src="${TURNSTILE_SCRIPT}"]`
    );
    if (existingScript) existingScript.remove();

    const script = document.createElement("script");
    script.src = `${TURNSTILE_SCRIPT}?onload=${uniqueId}&render=explicit`;
    script.async = true;
    script.defer = true;
    script.onerror = () => callbacksRef.current.onError?.();
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      const container = containerRef.current;
      const widgetId = widgetIdRef.current;
      if (container && widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, renderWidget]);

  if (!siteKey) return null;

  return <div ref={containerRef} className="turnstile-widget" />;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          appearance?: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}
