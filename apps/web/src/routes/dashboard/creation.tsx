import { createFileRoute } from "@tanstack/react-router";
import { useDashboard } from "@/lib/dashboard-context";
import { useUIStore } from "@/lib/store";
import { CreationView } from "@/components/panels/CreationView";

export const Route = createFileRoute("/dashboard/creation")({ component: CreationPage });

function CreationPage() {
  const { runtimes } = useDashboard();
  const settings = useUIStore((s) => s.settings);

  return <CreationView runtimes={runtimes} settings={settings ?? null} />;
}
