import {
  useEffect,
  useRef,
  useState,
  useCallback,
  lazy,
  Suspense,
  type ComponentType,
} from "react";
import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { createClientOnlyFn } from "@tanstack/react-start";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { RequireAuth } from "@/components/providers/ClerkAuthGate";
import { isAuthTransition } from "@/components/providers/ClerkAuthGate";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardActivityPanel } from "@/components/panels/DashboardActivityPanel";
import { Toolbar } from "@/components/layout/Toolbar";
import { useUIStore } from "@/lib/store";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useBoardStore } from "@/lib/stores/board";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { getViewFromPath } from "@/lib/dashboard-routing";
import {
  getCapabilityModeFromPath,
  getCapabilityPath,
  isCapabilityView,
} from "@/lib/capability-routing";
import { search_bookmarks } from "@/paraglide/messages";

// Lazy-loaded dialogs — only loaded when first opened, ~115KB deferred from initial bundle
const SettingsDialog = lazy(() =>
  import("@/components/dialogs/SettingsDialog").then((m) => ({
    default: m.SettingsDialog,
  })),
);
const CreateBoardConversationDialog = lazy(() =>
  import("@/components/dialogs/CreateBoardConversationDialog").then((m) => ({
    default: m.CreateBoardConversationDialog,
  })),
);
const OnboardingChangelogDialog = lazy(() =>
  import("@/components/dialogs/OnboardingChangelogDialog").then((m) => ({
    default: m.OnboardingChangelogDialog,
  })),
);

const ACTIVITY_PANEL_TRANSITION_MS = 320;
const ACTIVITY_PANEL_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const ONBOARDING_SEEN_KEY = "orchos-onboarding-seen";

const loadAuthTransitionOverlay = createClientOnlyFn(async () => {
  const mod = await import("@/components/ui/auth-transition-overlay");
  return mod.AuthTransitionOverlay;
});

export const Route = createFileRoute("/dashboard")({
  component: DashboardWrapper,
});

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

function DashboardContentInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeLoading = useRouterState({
    select: (state) => state.isLoading,
  });

  const dashboardPath = location.pathname;
  const activeView = getViewFromPath(dashboardPath);
  const capabilityViewMode = isCapabilityView(activeView)
    ? getCapabilityModeFromPath(dashboardPath, activeView)
    : "mine";
  const [showAuthTransition, setShowAuthTransition] = useState(() =>
    isAuthTransition(),
  );
  const [startDashboardReveal, setStartDashboardReveal] = useState(false);
  const [AuthTransitionOverlay, setAuthTransitionOverlay] =
    useState<ComponentType<{
      active: boolean;
      reveal: boolean;
      onComplete?: () => void;
    }> | null>(() => {
      if (typeof window === "undefined") return null;
      void loadAuthTransitionOverlay().then((loaded) =>
        setAuthTransitionOverlay(() => loaded),
      );
      return null;
    });

  const [createBoardDialogOpen, setCreateBoardDialogOpen] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<
    "general" | "notifications" | "mail" | "about"
  >(() => {
    if (typeof window === "undefined") return "general";
    const params = new URLSearchParams(window.location.search);
    return (params.get("tab") as "general" | "notifications" | "mail" | "about") ?? "general";
  });
  const [firstTimeOnboardingOpen, setFirstTimeOnboardingOpen] = useState(false);
  const onboardingCheckedRef = useRef(false);
  const revealTriggeredRef = useRef(false);
  const createBoardTask = useBoardStore((state) => state.createTask);

  const {
    organizations,
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
  const sidebarNavLoading = loading || routeLoading;

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

  const isMobile = useMediaQuery("(max-width: 767px)");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Stable callbacks for memoized subsection components
  const handleDesktopSettingsOpen = useCallback(() => {
    setShowSettingsDialog(true);
  }, [setShowSettingsDialog]);

  const handleMobileSettingsOpen = useCallback(() => {
    setMobileSidebarOpen(false);
    setShowSettingsDialog(true);
  }, [setShowSettingsDialog]);

  const handleMobileSidebarClose = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  const dashboardColumnsDesktop = activityExpanded
    ? "auto minmax(0,0fr) minmax(0,1fr)"
    : `auto minmax(0,1fr) ${activityPanelOpen ? "300px" : "0px"}`;
  const dashboardColumns = isMobile ? "1fr" : dashboardColumnsDesktop;

  // Handle OAuth callback redirects with URL params
  // oxlint-disable-next-line react-doctor/no-initialize-state -- store action + URL side effect, not state init
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("oauth_error");
    const tab = params.get("tab");

    if (tab === "mail" || error) {
      setShowSettingsDialog(true);
    }

    if (error || tab) {
      const url = new URL(window.location.href);
      url.searchParams.delete("oauth_error");
      url.searchParams.delete("tab");
      window.history.replaceState({}, "", url.toString());
    }
  }, [setShowSettingsDialog]);

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
        {/* Mobile sidebar drawer */}
        {isMobile && (
          <>
            <button
              type="button"
              aria-label="Close sidebar"
              className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-out ${
                mobileSidebarOpen
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none"
              }`}
              onClick={handleMobileSidebarClose}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleMobileSidebarClose();
                }
              }}
            />
            <div
              className={`fixed left-0 top-0 z-50 h-full transition-transform duration-300 ease-out ${
                mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <DashboardSidebar
                isMobile
                organizations={organizations}
                activeOrganizationId={activeOrganizationId}
                activeView={activeView}
                collapsed={false}
                loading={sidebarNavLoading}
                onOpenSettings={handleMobileSettingsOpen}
                onOrganizationChange={setActiveOrganizationId}
                onOrganizationCreate={handleOrganizationCreate}
                onOrganizationRename={handleOrganizationRename}
                onOrganizationDelete={handleOrganizationDelete}
                onToggleCollapse={toggleSidebar}
              />
            </div>
          </>
        )}
        {/* Mobile activity panel drawer */}
        {isMobile && activityPanelOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-out opacity-100"
              role="button"
              tabIndex={0}
              aria-label="Close activity panel"
              onClick={toggleActivityPanel}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleActivityPanel();
                }
              }}
            />
            <div className="fixed right-0 top-0 z-50 h-full w-full max-w-sm transition-transform duration-300 ease-out translate-x-0">
              <DashboardActivityPanel collapsed={false} />
            </div>
          </>
        )}
        <div
          className="grid flex-1 overflow-hidden transition-[grid-template-columns]"
          style={{
            gridTemplateColumns: dashboardColumns,
            transitionDuration: `${ACTIVITY_PANEL_TRANSITION_MS}ms`,
            transitionTimingFunction: ACTIVITY_PANEL_EASING,
          }}
        >
          {!isMobile && (
            <DashboardSidebar
              organizations={organizations}
              activeOrganizationId={activeOrganizationId}
              activeView={activeView}
              collapsed={sidebarCollapsed}
              loading={sidebarNavLoading}
              onOpenSettings={handleDesktopSettingsOpen}
              onOrganizationChange={setActiveOrganizationId}
              onOrganizationCreate={handleOrganizationCreate}
              onOrganizationRename={handleOrganizationRename}
              onOrganizationDelete={handleOrganizationDelete}
              onToggleCollapse={toggleSidebar}
            />
          )}
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
                onToggleMobileSidebar={
                  isMobile ? () => setMobileSidebarOpen((v) => !v) : undefined
                }
                agentsView={
                  new URLSearchParams(location.search).get("view") ===
                  "observability"
                    ? "observability"
                    : "config"
                }
                onAgentsViewChange={(view) =>
                  void navigate({
                    to: "/dashboard/agents",
                    search: { view },
                    replace: true,
                  })
                }
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
                      aria-label={search_bookmarks()}
                      className="w-full rounded-md border border-border bg-background py-1 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
                    />
                  </div>
                )}
              </Toolbar>
              <Outlet />
            </div>
          </div>
          {!isMobile && (
            <DashboardActivityPanel collapsed={!activityPanelOpen} />
          )}
        </div>
        <Suspense fallback={null}>
          <SettingsDialog
            key={`settings-dialog-${String(showSettingsDialog)}-${settingsDefaultTab}`}
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
        </Suspense>
        <Suspense fallback={null}>
          <CreateBoardConversationDialog
            key={createBoardDialogOpen ? "create" : "closed"}
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
        </Suspense>
        <Suspense fallback={null}>
          <OnboardingChangelogDialog
            key={String(firstTimeOnboardingOpen)}
            open={firstTimeOnboardingOpen}
            onClose={() => {
              setFirstTimeOnboardingOpen(false);
              try {
                localStorage.setItem(ONBOARDING_SEEN_KEY, "1");
              } catch {}
            }}
          />
        </Suspense>
      </div>
    </>
  );
}
