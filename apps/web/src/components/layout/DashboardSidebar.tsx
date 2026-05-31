import { memo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { SidebarView, Organization } from "@/lib/types";

export const DashboardSidebar = memo(function DashboardSidebar({
  isMobile: _isMobile,
  organizations,
  activeOrganizationId,
  activeView,
  collapsed,
  loading,
  onOpenSettings,
  onOrganizationChange,
  onOrganizationCreate,
  onOrganizationRename,
  onOrganizationDelete,
  onToggleCollapse,
}: {
  isMobile?: boolean;
  organizations: Organization[];
  activeOrganizationId: string | null;
  activeView: SidebarView;
  collapsed: boolean;
  loading: boolean;
  onOpenSettings: () => void;
  onOrganizationChange: (id: string) => void;
  onOrganizationCreate: (name: string) => Promise<void>;
  onOrganizationRename: (orgId: string, name: string) => Promise<void>;
  onOrganizationDelete: (orgId: string) => Promise<void>;
  onToggleCollapse: () => void;
}) {
  return (
    <Sidebar
      isMobile={_isMobile}
      organizations={organizations}
      activeOrganizationId={activeOrganizationId}
      activeView={activeView}
      collapsed={collapsed}
      loading={loading}
      onOpenSettings={onOpenSettings}
      onOrganizationChange={onOrganizationChange}
      onOrganizationCreate={onOrganizationCreate}
      onOrganizationRename={onOrganizationRename}
      onOrganizationDelete={onOrganizationDelete}
      onToggleCollapse={onToggleCollapse}
    />
  );
});
