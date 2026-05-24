import { useEffect, useRef, useState, type ComponentType } from "react";
import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { createClientOnlyFn } from "@tanstack/react-start";
import { useAuth } from "@clerk/clerk-react";
import { isClerkConfigured } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { ActivityPanel } from "@/components/panels/ActivityPanel";
import { SettingsDialog } from "@/components/dialogs/SettingsDialog";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AsciiLoading } from "@/components/ui/ascii-loading";
import { Toolbar } from "@/components/layout/Toolbar";
import { CreateBoardConversationDialog } from "@/components/dialogs/CreateBoardConversationDialog";
import { OnboardingChangelogDialog } from "@/components/dialogs/OnboardingChangelogDialog";
import { useUIStore } from "@/lib/store";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useBoardStore } from "@/lib/stores/board";
import type { SidebarView } from "@/lib/types";
import {
  getCapabilityModeFromPath,
  getCapabilityPath,
  isCapabilityView,
} from "@/lib/capability-routing";
import { checking_auth, search_bookmarks } from "@/paraglide/messages";

const ACTIVITY_PANEL_TRANSITION_MS = 320;
const ACTIVITY_PANEL_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const ONBOARDING_SEEN_KEY = "orchos-onboarding-seen";

const loadAuthTransitionOverlay = createClientOnlyFn(async () => {
  const mod = await import("@/components/ui/auth-transition-overlay");
  return mod.AuthTransitionOverlay;
});

export const Route = createFileRoute("/dashboard")({
  component: DashboardContent,
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured()) return <>{children}</>;
  return <ClerkAuthGate>{children}</ClerkAuthGate>;
}

function isAuthTransition(): boolean {
  try {
    return sessionStorage.getItem("orch_auth_transition") === "true";
  } catch {
    return false;
  }
}

function ClerkAuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const hasRedirectedRef = useRef(false);
  const fromAuth = isAuthTransition();

  useEffect(() => {
    if (!isLoaded || isSignedIn || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    void navigate({ to: "/sign-in", replace: true });
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    if (fromAuth) {
      return (
        <div className="relative h-screen overflow-hidden bg-background">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100 blur-xl scale-105"
            style={{ backgroundImage: "url('/hero/background.png')" }}
          />
          <div className="absolute inset-0 bg-background/72 backdrop-blur-[2px]" />
          <div className="relative flex h-full items-center justify-center">
            <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-white/85 shadow-lg backdrop-blur-md">
              <AsciiLoading
                label={checking_auth()}
                className="text-white/85"
                chipClassName="bg-white/10 text-white/85"
                textClassName="text-sm"
              />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <AsciiLoading label="Loading..." />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <AsciiLoading label="Loading..." />
      </div>
    );
  }

  return <>{children}</>;
}

function getViewFromPath(pathname: string): SidebarView {
  const segment = pathname.replace("/dashboard/", "").replace("/dashboard", "").split("/")[0] ?? "";
  const validViews: SidebarView[] = [
    "inbox",
    "creation",
    "bookmarks",
    "board",
    "calendar",
    "mail",
    "observability",
    "agents",
  ];
  return validViews.includes(segment as SidebarView) ? (segment as SidebarView) : "inbox";
}

function DashboardWrapper() {
  return (
    <AuthProvider>
      <RequireAuth>
        <DashboardProvider>
          <DashboardContentInner />
        </DashboardProvider>
      </RequireAuth>
    </AuthProvider>
  );
}

function DashboardContent() {
  return <DashboardWrapper />;
}

function DashboardContentInner() {
  const location = useLocation();
  const navigate = useNavigate();

  const dashboardPath = location.pathname;
  const activeView = getViewFromPath(dashboardPath);
  const capabilityViewMode = isCapabilityView(activeView)
    ? getCapabilityModeFromPath(dashboardPath, activeView)
    : "mine";
  const [showAuthTransition, setShowAuthTransition] = useState(() => isAuthTransition());
  const [startDashboardReveal, setStartDashboardReveal] = useState(false);
  const [AuthTransitionOverlay, setAuthTransitionOverlay] = useState<ComponentType<{
    active: boolean;
    reveal: boolean;
    onComplete?: () => void;
  }> | null>(null);
  const [createBoardDialogOpen, setCreateBoardDialogOpen] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<
    "general" | "notifications" | "mail" | "about"
  >("general");
  const [firstTimeOnboardingOpen, setFirstTimeOnboardingOpen] = useState(false);
  const onboardingCheckedRef = useRef(false);
  const revealTriggeredRef = useRef(false);
  const createBoardTask = useBoardStore((state) => state.createTask);

  const {
    organizations,
    problems,
    settings,
    refreshAll,
    handleOrganizationCreate,
    handleOrganizationRename,
    handleOrganizationDelete,
    showSettingsDialog,
    setShowSettingsDialog,
    uiPreviewTarget,
    setUiPreviewTarget,
    searchQuery,
    setSearchQuery,
    inboxCounts,
    loading,
  } = useDashboard();

  const {
    activeOrganizationId,
    setActiveOrganizationId,
    sourceFilter,
    setSourceFilter,
    inboxStatusFilter,
    setInboxStatusFilter,
    mailFolderFilter,
    setMailFolderFilter,
    calendarViewMode,
    setCalendarViewMode,
    boardFilter,
    setBoardFilter,
    activityPanelOpen,
    toggleActivityPanel,
    activityExpanded,
    sidebarCollapsed,
    toggleSidebar,
  } = useUIStore();

  const dashboardColumns = activityExpanded
    ? "auto minmax(0,0fr) minmax(0,1fr)"
    : `auto minmax(0,1fr) ${activityPanelOpen ? "300px" : "0px"}`;

  useEffect(() => {
    let mounted = true;

    void loadAuthTransitionOverlay().then((loaded) => {
      if (mounted) {
        setAuthTransitionOverlay(() => loaded);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (revealTriggeredRef.current || loading) {
      return;
    }

    revealTriggeredRef.current = true;

    if (!showAuthTransition) {
      try {
        sessionStorage.removeItem("orch_auth_transition");
      } catch {}
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStartDashboardReveal(true);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [loading, showAuthTransition]);

  useEffect(() => {
    if (uiPreviewTarget !== "send-shortcut") {
      return;
    }

    if (activeView !== "creation") {
      void navigate({ to: "/dashboard/creation" });
    }
  }, [activeView, navigate, uiPreviewTarget]);

  // First-time onboarding: show the tour dialog once after the dashboard loads
  useEffect(() => {
    if (onboardingCheckedRef.current || loading) {
      return;
    }

    // Don't show onboarding during auth transition; wait for it to complete
    if (showAuthTransition) {
      return;
    }

    onboardingCheckedRef.current = true;

    try {
      const seen = localStorage.getItem(ONBOARDING_SEEN_KEY);
      if (!seen) {
        // Small delay so the dashboard renders first, then the dialog appears
        const timer = window.setTimeout(() => {
          setFirstTimeOnboardingOpen(true);
        }, 600);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable; skip onboarding
    }
  }, [loading, showAuthTransition]);

  return (
    <>
      {AuthTransitionOverlay ? (
        <AuthTransitionOverlay
          active={showAuthTransition}
          reveal={startDashboardReveal}
          onComplete={() => {
            setShowAuthTransition(false);
            try {
              sessionStorage.removeItem("orch_auth_transition");
            } catch {}
          }}
        />
      ) : null}
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <div
          className="grid flex-1 overflow-hidden transition-[grid-template-columns]"
          style={{
            gridTemplateColumns: dashboardColumns,
            transitionDuration: `${ACTIVITY_PANEL_TRANSITION_MS}ms`,
            transitionTimingFunction: ACTIVITY_PANEL_EASING,
          }}
        >
          <Sidebar
            organizations={organizations}
            activeOrganizationId={activeOrganizationId}
            activeView={activeView}
            collapsed={sidebarCollapsed}
            onOpenSettings={() => setShowSettingsDialog(true)}
            onOrganizationChange={setActiveOrganizationId}
            onOrganizationCreate={handleOrganizationCreate}
            onOrganizationRename={handleOrganizationRename}
            onOrganizationDelete={handleOrganizationDelete}
            onToggleCollapse={toggleSidebar}
          />
          <div
            className={[
              "flex min-w-0 flex-col overflow-hidden transition-[opacity,transform,filter]",
              activityExpanded
                ? "pointer-events-none -translate-x-3 opacity-0 blur-[1px]"
                : "translate-x-0 opacity-100 blur-0",
            ].join(" ")}
            style={{
              transitionDuration: `${ACTIVITY_PANEL_TRANSITION_MS}ms`,
              transitionTimingFunction: ACTIVITY_PANEL_EASING,
            }}
            aria-hidden={activityExpanded}
          >
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <Toolbar
                activeView={activeView}
                loading={loading}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activityPanelOpen={activityPanelOpen}
                onToggleActivityPanel={toggleActivityPanel}
                sourceFilter={sourceFilter}
                onSourceFilterChange={setSourceFilter}
                inboxStatusFilter={inboxStatusFilter}
                onInboxStatusFilterChange={setInboxStatusFilter}
                mailFolderFilter={mailFolderFilter}
                onMailFolderFilterChange={setMailFolderFilter}
                calendarViewMode={calendarViewMode}
                onCalendarViewModeChange={setCalendarViewMode}
                boardFilter={boardFilter}
                onBoardFilterChange={setBoardFilter}
                inboxCounts={inboxCounts}
                agentModelFilter="all"
                onAgentModelFilterChange={() => {}}
                agentModelCounts={{ all: 0, local: 0, cloud: 0 }}
                capabilityViewMode={capabilityViewMode}
                onCapabilityViewModeChange={(mode) => {
                  if (isCapabilityView(activeView)) {
                    void navigate({ to: getCapabilityPath(activeView, mode) });
                  }
                }}
                onOpenCreateGoal={
                  activeView === "board"
                    ? () => {
                        setCreateBoardDialogOpen(true);
                      }
                    : undefined
                }
                onOpenMailAccounts={() => {
                  setSettingsDefaultTab("mail");
                  setShowSettingsDialog(true);
                }}
                onRefresh={refreshAll}
              >
                {activeView === "bookmarks" && (
                  <div className="relative mx-auto w-full max-w-md">
                    <HugeiconsIcon
                      icon={Search01Icon}
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={search_bookmarks()}
                      className="w-full rounded-md border border-border bg-background py-1 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:ring-1 focus:ring-ring/50"
                    />
                  </div>
                )}
              </Toolbar>
              <Outlet />
            </div>
          </div>
          <ActivityPanel problems={problems} collapsed={!activityPanelOpen} />
        </div>
        {showSettingsDialog && (
          <SettingsDialog
            open={showSettingsDialog}
            onClose={() => {
              setShowSettingsDialog(false);
              setSettingsDefaultTab("general");
              setUiPreviewTarget(null);
            }}
            settings={settings}
            onSettingsChange={useUIStore.getState().setSettings}
            defaultTab={settingsDefaultTab}
          />
        )}
        <CreateBoardConversationDialog
          open={createBoardDialogOpen}
          onClose={() => setCreateBoardDialogOpen(false)}
          onSubmit={async (values) => {
            createBoardTask({
              title: values.title,
              description: values.description,
              projectId: values.projectId,
              dueDate: values.dueDate,
              priority: values.priority,
              tags: values.tags,
              subtasks: values.subtasks,
            });
          }}
        />
        <OnboardingChangelogDialog
          open={firstTimeOnboardingOpen}
          onClose={() => {
            setFirstTimeOnboardingOpen(false);
            try {
              localStorage.setItem(ONBOARDING_SEEN_KEY, "1");
            } catch {}
          }}
        />
      </div>
    </>
  );
}
