import {
  useEffect,
  useRef,
  useState,
  useCallback,
  lazy,
  Suspense,
  memo,
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
import { useAuth } from "@clerk/clerk-react";
import { isClerkConfigured } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { ActivityPanel } from "@/components/panels/ActivityPanel";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AsciiLoading } from "@/components/ui/ascii-loading";
import { Toolbar } from "@/components/layout/Toolbar";
import { useUIStore } from "@/lib/store";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useBoardStore } from "@/lib/stores/board";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import type { SidebarView, Organization } from "@/lib/types";
import {
  getCapabilityModeFromPath,
  getCapabilityPath,
  isCapabilityView,
} from "@/lib/capability-routing";
import { checking_auth, search_bookmarks } from "@/paraglide/messages";

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
  const segment =
    pathname
      .replace("/dashboard/", "")
      .replace("/dashboard", "")
      .split("/")[0] ?? "";
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
  return validViews.includes(segment as SidebarView)
    ? (segment as SidebarView)
    : "inbox";
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

// ── Memoized subsection components ──────────────────────────────

const DashboardSidebar = memo(function DashboardSidebar({
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

const DashboardActivityPanel = memo(function DashboardActivityPanel({
  collapsed,
}: {
  collapsed: boolean;
}) {
  return <ActivityPanel collapsed={collapsed} />;
});

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

  // Handle OAuth callback redirects with URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("oauth_error");
    const tab = params.get("tab");

    if (tab) {
      setSettingsDefaultTab(tab as "general" | "notifications" | "mail" | "about");
    }

    if (tab === "mail" || error) {
      setShowSettingsDialog(true);
    }

    if (error || tab) {
      // Clean up the URL
      const url = new URL(window.location.href);
      url.searchParams.delete("oauth_error");
      url.searchParams.delete("tab");
      window.history.replaceState({}, "", url.toString());
    }
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
        {/* Mobile sidebar drawer */}
        {isMobile && (
          <>
            <div
              className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-out ${
                mobileSidebarOpen
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none"
              }`}
              onClick={handleMobileSidebarClose}
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
              onClick={toggleActivityPanel}
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
