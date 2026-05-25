import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { isProEnabled } from "@/lib/pro-loader";

interface ProFeatureGateProps {
  /** Fallback UI shown when pro module is not available */
  fallback?: ReactNode;
  /** Module path under @orchos/pro/ (e.g. "upgrade" → @orchos/pro/upgrade) */
  module: string;
  /** Component to render from the loaded module */
  exportName?: string;
  /** Props passed to the loaded component */
  componentProps?: Record<string, unknown>;
  /** Render prop pattern — receives the loaded component */
  children?: (Component: ComponentType) => ReactNode;
}

/**
 * Renders a pro feature component if the @orchos/pro package is available.
 * Shows fallback (or nothing) when pro is not installed.
 */
export function ProFeatureGate({
  fallback = null,
  module: modulePath,
  exportName = "default",
  componentProps = {},
  children,
}: ProFeatureGateProps) {
  const [ProComponent, setProComponent] = useState<ComponentType | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isProEnabled()) {
        setLoading(false);
        return;
      }
      try {
        const mod = await import(
          /* @vite-ignore */ `@orchos/pro/${modulePath}`
        );
        if (!cancelled) {
          const exported = mod[exportName];
          setProComponent(() => exported ?? null);
        }
      } catch {
        // Module not available
      }
      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [modulePath, exportName]);

  if (loading) return null;
  if (!ProComponent) return <>{fallback}</>;

  if (children) {
    return <>{children(ProComponent)}</>;
  }

  return <ProComponent {...componentProps} />;
}
