import { createFileRoute } from "@tanstack/react-router";
import { createClientOnlyFn } from "@tanstack/react-start";
import { useEffect, useState, type ComponentType } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { useUIStore } from "@/lib/store";
import type { ControlSettings, RuntimeProfile } from "@/lib/types";

export const Route = createFileRoute("/dashboard/creation")({ component: CreationPage });

const loadCreationView = createClientOnlyFn(async () => {
  const mod = await import("@/components/panels/CreationView");
  return mod.CreationView;
});

function CreationPage() {
  const { runtimes } = useDashboard();
  const settings = useUIStore((s) => s.settings);
  const [View, setView] = useState<ComponentType<{
    runtimes: RuntimeProfile[];
    settings: ControlSettings | null;
  }> | null>(null);

  useEffect(() => {
    let mounted = true;

    void loadCreationView().then((loaded) => {
      if (mounted) {
        setView(() => loaded);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!View) {
    return <div className="h-full bg-background" />;
  }

  return <View runtimes={runtimes} settings={settings ?? null} />;
}
