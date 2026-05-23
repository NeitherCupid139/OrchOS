import { CreationView } from "@/components/panels/CreationView";
import { useDashboard } from "@/lib/dashboard-context";
import { useUIStore } from "@/lib/store";

export function CreationPage() {
  const { runtimes } = useDashboard();
  const settings = useUIStore((s) => s.settings);

  return <CreationView runtimes={runtimes} settings={settings ?? null} />;
}
