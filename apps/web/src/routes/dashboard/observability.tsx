import { createFileRoute } from "@tanstack/react-router";
import { createClientOnlyFn } from "@tanstack/react-start";
import { useEffect, useState, type ComponentType } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import type { Problem } from "@/lib/types";

export const Route = createFileRoute("/dashboard/observability")({ component: ObservabilityPage });

const loadObservabilityView = createClientOnlyFn(async () => {
  const mod = await import("@/components/panels/ObservabilityView");
  return mod.ObservabilityView;
});

function ObservabilityPage() {
  const { problems } = useDashboard();
  const [View, setView] = useState<ComponentType<{ problems: Problem[] }> | null>(null);

  useEffect(() => {
    let mounted = true;

    void loadObservabilityView().then((loaded) => {
      if (mounted) {
        setView(() => loaded);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return View ? <View problems={problems} /> : <div className="h-full bg-background" />;
}
