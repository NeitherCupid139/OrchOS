import { memo } from "react";
import { ActivityPanel } from "@/components/panels/ActivityPanel";

export const DashboardActivityPanel = memo(function DashboardActivityPanel({
  collapsed,
}: {
  collapsed: boolean;
}) {
  return <ActivityPanel collapsed={collapsed} />;
});
