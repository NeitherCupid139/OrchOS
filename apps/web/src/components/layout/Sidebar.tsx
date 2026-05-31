import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useClerk, useOrganization, useUser } from "@clerk/clerk-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  InfoCard,
  InfoCardTitle,
  InfoCardDescription,
  InfoCardContent,
  InfoCardMedia,
  InfoCardFooter,
  InfoCardDismiss,
} from "@/components/ui/info-card";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Spinner } from "@/components/ui/spinner";
import {
  DashboardCircleIcon,
  CommandIcon,
  Key01Icon,
  Target01Icon,
  ChevronDown,
  ChevronUp,
  Settings02Icon,
  Tick02Icon,
  MoreHorizontal,
  Edit02Icon,
  Delete02Icon,
  ComputerIcon,
  UserCircleIcon,
  Logout03Icon,
  Chat01Icon,
  Bookmark01Icon,
  Calendar03Icon,
  Mail01Icon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
  Add01Icon,
  CrownIcon,
} from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RenameDialog } from "@/components/dialogs/RenameDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  agents,
  board,
  bookmarks,
  calendar,
  cancel,
  collapse_sidebar,
  create_space,
  creation,
  delete as delete_message,
  delete_space,
  dismiss,
  edit,
  expand_sidebar,
  log_out,
  mail,
  profile_basic_info,
  profile_basic_info_desc,
  profile_email_verification,
  profile_email_verification_desc,
  profile_first_name,
  profile_last_name,
  profile_login_email,
  profile_login_email_desc,
  profile_no_email,
  profile_password_signin,
  profile_password_signin_desc,
  profile_saving,
  profile_security_section,
  profile_settings,
  profile_status_enabled,
  profile_status_verified,
  profile_tab_profile,
  profile_tab_security,
  profile_two_factor,
  profile_two_factor_desc,
  profile_tab_membership,
  profile_username,
  profile_membership_plan,
  profile_membership_plan_desc,
  profile_membership_credits,
  profile_membership_credits_desc,
  profile_membership_tokens_used,
  profile_membership_tokens_used_desc,
  profile_membership_upgrade,
  profile_membership_upgrade_desc,
  profile_membership_manage,
  rename,
  rename_space,
  save,
  select_organization,
  settings as settings_label,
  space_created,
  space_launcher_all,
  space_launcher_search_placeholder,
  space_name_placeholder,
  user as user_label,
  view,
  welcome_desc,
  welcome_to_orchos,
  workspace,
  auth_verify_button,
} from "@/paraglide/messages";
import { isClerkConfigured } from "@/lib/auth";
import { useLocale } from "@/lib/i18n-provider";
import { useUIStore } from "@/lib/store";
import type { Organization, SidebarView } from "@/lib/types";
import { OnboardingChangelogDialog } from "@/components/dialogs/OnboardingChangelogDialog";
import { api } from "@/lib/api";
import { isProEnabled } from "@/lib/pro-loader";

interface SidebarSection {
  label: string;
  items: {
    id: SidebarView;
    to: string;
    icon: IconSvgElement;
    label: string;
    shortcut?: string;
    badge?: number;
    badgeCritical?: boolean;
  }[];
}

interface SidebarProps {
  organizations: Organization[];
  activeOrganizationId: string | null;
  activeView: SidebarView;
  collapsed: boolean;
  loading?: boolean;
  isMobile?: boolean;
  onOpenSettings: () => void;
  onOrganizationChange: (id: string) => void;
  onOrganizationCreate: (name: string) => Promise<void>;
  onOrganizationRename: (id: string, name: string) => void;
  onOrganizationDelete: (id: string) => void;
  onToggleCollapse: () => void;
}

export function Sidebar({
  organizations,
  activeOrganizationId,
  activeView,
  collapsed,
  loading = false,
  isMobile = false,
  onOpenSettings,
  onOrganizationChange,
  onOrganizationCreate,
  onOrganizationRename,
  onOrganizationDelete,
  onToggleCollapse,
}: SidebarProps) {
  const { locale: _locale } = useLocale();
  const effectiveCollapsed = isMobile ? false : collapsed;
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [targetOrganizationId, setTargetOrganizationId] = useState<
    string | null
  >(null);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [showExpandedContent, setShowExpandedContent] =
    useState(!effectiveCollapsed);
  const filteredOrganizations = useMemo(
    () =>
      organizations.filter((org) =>
        org.name.toLowerCase().includes(orgSearch.trim().toLowerCase()),
      ),
    [organizations, orgSearch],
  );

  const navigate = useNavigate();
  const showShortcutHints = useUIStore(
    (s) => s.settings?.showShortcutHints ?? false,
  );
  const sidebarItemNotifications = useUIStore(
    (s) => s.sidebarItemNotifications,
  );
  const clearSidebarViewNotification = useUIStore(
    (s) => s.clearSidebarViewNotification,
  );
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Clear pendingNav during render when navigation completes
  if (pendingNav && activeView === pendingNav && !loading) {
    setPendingNav(null);
  }

  function handleNavClick(id: SidebarView) {
    setPendingNav(id);
    clearSidebarViewNotification(id);
    clearTimeout(pendingTimerRef.current);
    // Safety timeout to clear if navigation fails
    pendingTimerRef.current = setTimeout(() => setPendingNav(null), 4000);
  }

  // react-doctor-disable-next-line react-doctor/exhaustive-deps -- unmount cleanup must read the latest timer set by navigation handlers
  useEffect(() => {
    return () => clearTimeout(pendingTimerRef.current);
  }, []);

  useEffect(() => {
    const shortcutMap: Record<string, string> = {
      1: "/dashboard/creation",
      2: "/dashboard/bookmarks",
      3: "/dashboard/board",
      4: "/dashboard/calendar",
      5: "/dashboard/mail",
      6: "/dashboard/agents",
      7: "/dashboard/observability",
    };

    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey
      ) {
        const path = shortcutMap[event.key];
        if (path) {
          event.preventDefault();
          navigate({ to: path });
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    if (effectiveCollapsed) {
      setShowExpandedContent(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowExpandedContent(true);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [effectiveCollapsed]);

  const sections: SidebarSection[] = useMemo(
    () => (void _locale, [
      {
        label: "",
        items: [
          {
            id: "creation",
            to: "/dashboard/creation",
            icon: Chat01Icon,
            label: creation(),
            shortcut: "1",
          },
          {
            id: "bookmarks",
            to: "/dashboard/bookmarks",
            icon: Bookmark01Icon,
            label: bookmarks(),
            shortcut: "2",
          },
        ],
      },
      {
        label: workspace(),
        items: [
          {
            id: "board",
            to: "/dashboard/board",
            icon: DashboardCircleIcon,
            label: board(),
            shortcut: "3",
          },
          {
            id: "calendar",
            to: "/dashboard/calendar",
            icon: Calendar03Icon,
            label: calendar(),
            shortcut: "4",
          },
          {
            id: "mail",
            to: "/dashboard/mail",
            icon: Mail01Icon,
            label: mail(),
            shortcut: "5",
          },
        ],
      },
      {
        label: agents(),
        items: [
          {
            id: "agents",
            to: "/dashboard/agents",
            icon: ComputerIcon,
            label: agents(),
            shortcut: "6",
          },
        ],
      },
    ]),
    [_locale],
  );

  return (
    <TooltipProvider delay={0}>
      <aside
        className={cn(
          "flex h-full flex-col border-r border-border bg-sidebar transition-[width] duration-300 ease-out",
          effectiveCollapsed ? "w-14" : "w-60",
        )}
      >
        {/* Organization Selector */}
        <div
          className={cn(
            "relative flex h-11 items-center border-b border-border",
            effectiveCollapsed ? "px-0" : "px-2",
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 transition-opacity duration-300 ease-out",
              effectiveCollapsed ? "justify-center px-0" : "px-0 pr-9",
              !showExpandedContent
                ? "pointer-events-none absolute opacity-0 delay-0"
                : "opacity-100 delay-180",
            )}
          >
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-sidebar-foreground/80 outline-none transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <HugeiconsIcon icon={Target01Icon} className="size-3.5" />
                </span>
                <span className="truncate">
                  {organizations.find((o) => o.id === activeOrganizationId)
                    ?.name || select_organization()}
                </span>
                <HugeiconsIcon
                  icon={ChevronDown}
                  className="ml-auto size-3 shrink-0 opacity-50"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-64">
                <div className="p-2">
                  <Input
                    value={orgSearch}
                    onChange={(e) => setOrgSearch(e.target.value)}
                    placeholder={space_launcher_search_placeholder()}
                    className="h-8 border-border/60 bg-background/80"
                  />
                </div>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{space_launcher_all()}</DropdownMenuLabel>
                  {filteredOrganizations.length > 0
                    ? filteredOrganizations.map((org) => (
                        <DropdownMenuItem
                          key={org.id}
                          onClick={() => onOrganizationChange(org.id)}
                        >
                          <span className="flex-1">{org.name}</span>
                          <div className="mr-1 flex items-center gap-1 opacity-0 transition-opacity group-data-[highlighted]/dropdown-menu-item:opacity-100">
                            <button
                              type="button"
                              aria-label={edit()}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setTargetOrganizationId(org.id);
                                setRenameOpen(true);
                              }}
                              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <HugeiconsIcon
                                icon={Edit02Icon}
                                className="size-3.5"
                              />
                            </button>
                            <button
                              type="button"
                              aria-label={delete_message()}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setTargetOrganizationId(org.id);
                                setDeleteConfirmOpen(true);
                              }}
                              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                            >
                              <HugeiconsIcon
                                icon={Delete02Icon}
                                className="size-3.5"
                              />
                            </button>
                          </div>
                          {org.id === activeOrganizationId && (
                            <HugeiconsIcon
                              icon={Tick02Icon}
                              className="size-4 text-primary"
                            />
                          )}
                        </DropdownMenuItem>
                      ))
                    : null}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{create_space()}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setCreateOrgOpen(true)}>
                    <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
                    {create_space()}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {activeOrganizationId && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger className="ml-0.5 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
                  <HugeiconsIcon icon={MoreHorizontal} className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-36">
                  <DropdownMenuItem
                    onClick={() => {
                      setTargetOrganizationId(activeOrganizationId);
                      setRenameOpen(true);
                    }}
                  >
                    <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                    {rename()}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setTargetOrganizationId(activeOrganizationId);
                      setDeleteConfirmOpen(true);
                    }}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                    {delete_message()}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {!isMobile && (
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                  <button
                    type="button"
                    {...props}
                    onClick={onToggleCollapse}
                    aria-label={
                      effectiveCollapsed ? expand_sidebar() : collapse_sidebar()
                    }
                    className={cn(
                      "absolute top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer",
                      effectiveCollapsed
                        ? "left-1/2 -translate-x-1/2"
                        : "right-1.5",
                    )}
                  >
                    <HugeiconsIcon
                      icon={
                        effectiveCollapsed
                          ? SidebarRight01Icon
                          : SidebarLeft01Icon
                      }
                      className="size-4"
                    />
                  </button>
                )}
              />
              <TooltipContent side="right">
                {effectiveCollapsed ? expand_sidebar() : collapse_sidebar()}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Navigation Sections */}
        <ScrollArea className="flex-1">
          <div
            className={cn(
              "space-y-1 px-2 pb-2 pt-2",
              effectiveCollapsed && "flex flex-col items-center",
            )}
          >
            {sections.map((section, si) => (
              <div
                key={si}
                className={cn(
                  "space-y-0.5",
                  effectiveCollapsed && "flex w-full flex-col items-center",
                )}
              >
                {section.label && (
                  <span
                    className={cn(
                      "block h-5 overflow-hidden px-2.5 text-[10px] leading-5 font-semibold uppercase tracking-wider text-muted-foreground/60 transition-opacity duration-300 ease-out",
                      !showExpandedContent
                        ? "opacity-0 delay-0"
                        : "opacity-100 delay-180",
                    )}
                    aria-hidden={!showExpandedContent}
                  >
                    {section.label}
                  </span>
                )}
                {section.items.map(
                  ({
                    id,
                    to,
                    icon: Icon,
                    label,
                    shortcut,
                    badge,
                    badgeCritical,
                  }) => {
                    const isActive = activeView === id;
                    const isPending = pendingNav === id;
                    const hasNotification =
                      (sidebarItemNotifications[id] ?? 0) > 0;
                    const navItem = (
                      <Link
                        key={id}
                        to={to}
                        preload={import.meta.env.DEV ? undefined : "intent"}
                        onClick={() => handleNavClick(id)}
                        className={cn(
                          "relative flex h-10 items-center rounded-md transition-colors outline-none focus-visible:outline-dashed focus-visible:outline-[0.5px] focus-visible:outline-blue-500 focus-visible:outline-offset-2",
                          effectiveCollapsed
                            ? "mx-auto size-10 justify-center gap-0 px-0"
                            : "w-full gap-2.5 px-2.5 text-sm",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        )}
                      >
                        {isPending ? (
                          <span className="inline-flex size-4 shrink-0 items-center justify-center">
                            <Spinner
                              size="sm"
                              name="braille"
                              className="leading-none"
                            />
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex size-4 shrink-0 items-center justify-center transition-transform duration-300 [transition-timing-function:cubic-bezier(0.2,0,0,1)]",
                              hasNotification && "-rotate-12",
                            )}
                          >
                            <HugeiconsIcon icon={Icon} className="size-4" />
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-left overflow-hidden whitespace-nowrap transition-[opacity,width] duration-300 ease-out",
                            !showExpandedContent
                              ? "w-0 shrink-0 opacity-0 delay-0"
                              : "min-w-0 flex-1 opacity-100 delay-180",
                          )}
                        >
                          {label}
                        </span>
                        {showExpandedContent &&
                          shortcut &&
                          showShortcutHints && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium tabular-nums transition-opacity duration-300 ease-out opacity-100 delay-220",
                                isActive
                                  ? "border-sidebar-foreground/15 bg-sidebar-background/60 text-sidebar-foreground/60"
                                  : "border-border/60 bg-background/70 text-muted-foreground",
                              )}
                              aria-label={`Shortcut ${shortcut}`}
                            >
                              <HugeiconsIcon
                                icon={CommandIcon}
                                className="size-3 shrink-0"
                              />
                              {shortcut}
                            </span>
                          )}
                        {badge != null && badge > 0 && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums overflow-hidden whitespace-nowrap transition-[opacity,width,padding,margin] duration-300 ease-out",
                              !showExpandedContent
                                ? "w-0 shrink-0 px-0 py-0 opacity-0 delay-0"
                                : "opacity-100 delay-220",
                              badgeCritical
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {badge}
                          </span>
                        )}
                        {hasNotification ? (
                          <span
                            aria-hidden
                            className={cn(
                              "shrink-0 rounded-full bg-red-500 shadow-[0_0_0_2px_var(--sidebar)] transition-[opacity,scale] duration-200",
                              effectiveCollapsed
                                ? "absolute right-2 top-2 size-2"
                                : "size-2",
                            )}
                          />
                        ) : null}
                      </Link>
                    );
                    if (effectiveCollapsed && !isMobile) {
                      return (
                        <Tooltip key={id}>
                          <TooltipTrigger
                            render={(_props) => (
                              <div className="flex w-full justify-center">
                                {navItem}
                              </div>
                            )}
                          />
                          <TooltipContent side="right">{label}</TooltipContent>
                        </Tooltip>
                      );
                    }
                    return navItem;
                  },
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Info Card */}
        <div
          className={cn(
            "px-3 pb-2 transition-opacity duration-200 ease-out",
            !showExpandedContent
              ? "hidden pointer-events-none opacity-0"
              : "block opacity-100 delay-300",
          )}
        >
          <InfoCard storageKey="sidebar-welcome" dismissType="forever">
            <InfoCardContent>
              <InfoCardTitle>{welcome_to_orchos()}</InfoCardTitle>
              <InfoCardDescription>{welcome_desc()}</InfoCardDescription>
            </InfoCardContent>
            <InfoCardMedia
              media={[
                {
                  src: "/hero/background.png",
                  alt: "OrchOS",
                },
              ]}
              shrinkHeight={60}
              expandHeight={120}
            />
            <InfoCardFooter>
              <InfoCardDismiss>{dismiss()}</InfoCardDismiss>
              <button
                type="button"
                onClick={() => setOnboardingOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOnboardingOpen(true);
                  }
                }}
                className="cursor-pointer rounded-md px-1.5 py-1 transition-colors hover:bg-accent/50 hover:text-foreground"
              >
                {view()}
              </button>
            </InfoCardFooter>
          </InfoCard>
        </div>

        {/* Bottom: User Profile */}
        <div
          className={cn(
            "border-t border-border",
            effectiveCollapsed ? "flex justify-center p-2" : "p-2",
          )}
        >
          <ClerkUserProfile
            onOpenSettings={onOpenSettings}
            collapsed={effectiveCollapsed}
            showExpandedContent={showExpandedContent}
          />
        </div>

        <RenameDialog
          open={createOrgOpen}
          title={create_space()}
          initialValue=""
          placeholder={space_name_placeholder()}
          onClose={() => setCreateOrgOpen(false)}
          onSubmit={async (name) => {
            await onOrganizationCreate(name);
            console.log(space_created());
            setCreateOrgOpen(false);
          }}
        />

        <RenameDialog
          open={renameOpen}
          title={rename_space()}
          initialValue={
            organizations.find((o) => o.id === targetOrganizationId)?.name ?? ""
          }
          placeholder={space_name_placeholder()}
          onClose={() => {
            setRenameOpen(false);
            setTargetOrganizationId(null);
          }}
          onSubmit={(name) => {
            if (targetOrganizationId)
              onOrganizationRename(targetOrganizationId, name);
            setRenameOpen(false);
            setTargetOrganizationId(null);
          }}
        />

        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={(open) => {
            setDeleteConfirmOpen(open);
            if (!open) {
              setTargetOrganizationId(null);
            }
          }}
          title={delete_space()}
          description={delete_space()}
          onConfirm={() => {
            if (targetOrganizationId)
              onOrganizationDelete(targetOrganizationId);
            setTargetOrganizationId(null);
          }}
          confirmLabel={delete_message()}
          variant="destructive"
        />
        <OnboardingChangelogDialog
          key={String(onboardingOpen)}
          open={onboardingOpen}
          onClose={() => setOnboardingOpen(false)}
        />
      </aside>
    </TooltipProvider>
  );
}

function ClerkUserProfile({
  onOpenSettings,
  collapsed,
  showExpandedContent,
}: {
  onOpenSettings: () => void;
  collapsed: boolean;
  showExpandedContent: boolean;
}) {
  const [profileOpen, setProfileOpen] = useState(false);

  if (!isClerkConfigured()) {
    if (collapsed) {
      return (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className="flex size-10 items-center justify-center rounded-md transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={UserCircleIcon} className="size-4" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            disableAnimation
            className="min-w-48"
          >
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <HugeiconsIcon icon={UserCircleIcon} className="size-3.5" />
              {profile_settings()}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettings}>
              <HugeiconsIcon icon={Settings02Icon} className="size-3.5" />
              {settings_label()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className="flex h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={UserCircleIcon} className="size-4" />
            </div>
            <div
              className={cn(
                "min-w-0 flex-1 text-left",
                !showExpandedContent && "invisible",
              )}
            >
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user_label()}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                user@orchos.dev
              </p>
            </div>
            <HugeiconsIcon
              icon={ChevronUp}
              className={cn(
                "size-3 shrink-0 opacity-50",
                !showExpandedContent && "invisible",
              )}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            disableAnimation
            className="mb-1 min-w-(--anchor-width)"
          >
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <HugeiconsIcon icon={UserCircleIcon} className="size-3.5" />
              {profile_settings()}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettings}>
              <HugeiconsIcon icon={Settings02Icon} className="size-3.5" />
              {settings_label()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ProfileEditDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          fallbackName={user_label()}
          fallbackEmail="user@orchos.dev"
        />
      </>
    );
  }

  return (
    <ClerkAuthenticatedProfile
      onOpenSettings={onOpenSettings}
      collapsed={collapsed}
      showExpandedContent={showExpandedContent}
    />
  );
}

function ClerkAuthenticatedProfile({
  onOpenSettings,
  collapsed,
  showExpandedContent,
}: {
  onOpenSettings: () => void;
  collapsed: boolean;
  showExpandedContent: boolean;
}) {
  const { user: clerkUser, isLoaded } = useUser();
  const { isLoaded: isOrganizationLoaded } = useOrganization();
  const { signOut } = useClerk();
  const [profileOpen, setProfileOpen] = useState(false);

  if (!isLoaded) {
    if (collapsed) {
      return (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className="flex size-10 items-center justify-center rounded-md transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={UserCircleIcon} className="size-4" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            disableAnimation
            className="min-w-48 mb-1"
          >
            <div className="flex items-center gap-2.5 p-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                U
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {user_label()}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  user@orchos.dev
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenSettings}>
              <HugeiconsIcon icon={Settings02Icon} className="size-3.5" />
              {settings_label()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className="flex h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HugeiconsIcon icon={UserCircleIcon} className="size-4" />
          </div>
          <span
            className={cn(
              "flex-1 truncate text-left",
              !showExpandedContent && "invisible",
            )}
          >
            {user_label()}
          </span>
          <HugeiconsIcon
            icon={ChevronUp}
            className={cn(
              "size-3 shrink-0 opacity-50",
              !showExpandedContent && "invisible",
            )}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          disableAnimation
          className="mb-1 min-w-(--anchor-width)"
        >
          <div className="flex items-center gap-2.5 p-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              U
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {user_label()}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                user@orchos.dev
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenSettings}>
            <HugeiconsIcon icon={Settings02Icon} className="size-3.5" />
            {settings_label()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (!clerkUser) return null;

  const displayName = clerkUser.fullName || clerkUser.username || user_label();
  const email = clerkUser.primaryEmailAddress?.emailAddress || "";
  const initials =
    `${clerkUser.firstName?.[0] || ""}${clerkUser.lastName?.[0] || clerkUser.username?.[0] || clerkUser.fullName?.[0] || "U"}`
      .trim()
      .slice(0, 2)
      .toUpperCase();

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          className={cn(
            "h-10 rounded-md text-left hover:bg-sidebar-accent/50 cursor-pointer",
            collapsed
              ? "flex size-10 items-center justify-center"
              : "flex w-full items-center gap-2.5 px-2.5",
          )}
        >
          {clerkUser.imageUrl ? (
            <img
              src={clerkUser.imageUrl}
              alt={displayName}
              className={cn(
                "shrink-0 rounded-full object-cover",
                collapsed ? "size-8" : "size-8",
              )}
            />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </div>
          )}
          {!collapsed && (
            <>
              <div
                className={cn(
                  "min-w-0 flex-1",
                  !showExpandedContent && "invisible",
                )}
              >
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {displayName}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/60">
                  {email}
                </p>
              </div>
              <HugeiconsIcon
                icon={ChevronUp}
                className={cn(
                  "size-3 shrink-0 opacity-50 text-sidebar-foreground/70",
                  !showExpandedContent && "invisible",
                )}
              />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={8}
          disableAnimation
          className={cn(
            "mb-1",
            collapsed ? "min-w-48" : "min-w-(--anchor-width)",
          )}
        >
          {collapsed && (
            <>
              <div className="flex items-center gap-2.5 p-2">
                {clerkUser.imageUrl ? (
                  <img
                    src={clerkUser.imageUrl}
                    alt={displayName}
                    className="size-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          {isOrganizationLoaded ? (
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <HugeiconsIcon icon={UserCircleIcon} className="size-3.5" />
              {profile_settings()}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={onOpenSettings}>
            <HugeiconsIcon icon={Settings02Icon} className="size-3.5" />
            {settings_label()}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
          >
            <HugeiconsIcon icon={Logout03Icon} className="size-3.5" />
            {log_out()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ProfileEditDialog
        key={`profile-${profileOpen ? "open" : "closed"}-${clerkUser?.id ?? "no-user"}`}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        clerkUser={clerkUser}
        fallbackName={displayName}
        fallbackEmail={email}
      />
    </>
  );
}

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clerkUser?: ReturnType<typeof useUser>["user"];
  fallbackName: string;
  fallbackEmail: string;
}

type ProfileDialogTab = "profile" | "security" | "membership";

const profileTabDefs: {
  id: ProfileDialogTab;
  icon: IconSvgElement;
  label: () => string;
}[] = [
  { id: "profile", icon: UserCircleIcon, label: profile_tab_profile },
  { id: "security", icon: Key01Icon, label: profile_tab_security },
  { id: "membership", icon: CrownIcon, label: profile_tab_membership },
];

function ProfileEditDialog({
  open,
  onOpenChange,
  clerkUser,
  fallbackName,
  fallbackEmail,
}: ProfileEditDialogProps) {
  const [firstName, setFirstName] = useState(clerkUser?.firstName ?? "");
  const [lastName, setLastName] = useState(clerkUser?.lastName ?? "");
  const [username, setUsername] = useState(clerkUser?.username ?? "");
  const activeTab = useUIStore((s) => s.profileDialogTab) as ProfileDialogTab;
  const setActiveTab = useUIStore((s) => s.setProfileDialogTab);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Security action states
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [addingPassword, setAddingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [enablingTwoFactor, setEnablingTwoFactor] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<
    "idle" | "showQr" | "verify"
  >("idle");
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Membership / Subscription state
  const [subscription, setSubscription] = useState<{
    userId: string;
    plan: "free" | "pro";
    creditsBalance: number;
    creditsTotal: number;
    tokensUsed: number;
    periodStart: string | null;
    periodEnd: string | null;
    status: string;
  } | null>(null);
  // Derived: loading while subscription hasn't been fetched yet
  const subLoading = open && activeTab === "membership" && subscription === null;
  const getFallbackSubscription = useCallback(
    () => ({
      userId: clerkUser?.id ?? "local",
      plan: "free" as const,
      creditsBalance: 100,
      creditsTotal: 100,
      tokensUsed: 0,
      periodStart: null,
      periodEnd: null,
      status: "active",
    }),
    [clerkUser?.id],
  );

  // Reset the Zustand tab to "profile" on mount (dialog remounts on key change)
  useEffect(() => {
    setActiveTab("profile");
  }, [setActiveTab]);

  // Fetch subscription data when membership tab is active.
  // open is guaranteed true when this component mounts (key-based remounting).
  useEffect(() => {
    if (activeTab !== "membership") return;
    let cancelled = false;
    async function load() {
      try {
        const sub = (await api.getSubscription()) as typeof subscription;
        if (!cancelled) setSubscription(sub ?? getFallbackSubscription());
      } catch {
        if (!cancelled) setSubscription(getFallbackSubscription());
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, getFallbackSubscription]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!clerkUser) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await clerkUser.update({
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        username: username.trim() || null,
      });
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const displayEmail =
    clerkUser?.primaryEmailAddress?.emailAddress || fallbackEmail;

  // ── Security action handlers ──

  const handleSendVerificationCode = async () => {
    if (!clerkUser?.primaryEmailAddress) return;
    setSecurityError(null);
    setVerifyingEmail(true);
    try {
      await clerkUser.primaryEmailAddress.prepareVerification({
        strategy: "email_code",
      });
      setVerificationCodeSent(true);
    } catch (err) {
      setSecurityError(
        err instanceof Error ? err.message : "Failed to send verification code",
      );
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!clerkUser?.primaryEmailAddress || !verificationCode.trim()) return;
    setSecurityError(null);
    setVerifyingEmail(true);
    try {
      const result = await clerkUser.primaryEmailAddress.attemptVerification({
        code: verificationCode,
      });
      if (result.verification.status === "verified") {
        setVerificationCodeSent(false);
        setVerificationCode("");
        await clerkUser.reload();
      }
    } catch (err) {
      setSecurityError(
        err instanceof Error ? err.message : "Failed to verify email",
      );
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleAddPassword = async () => {
    if (!clerkUser || !newPassword.trim()) return;
    setSecurityError(null);
    setSaving(true);
    try {
      await clerkUser.updatePassword({
        newPassword,
        signOutOfOtherSessions: false,
      });
      setAddingPassword(false);
      setNewPassword("");
      await clerkUser.reload();
    } catch (err) {
      setSecurityError(
        err instanceof Error ? err.message : "Failed to add password",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEnableTwoFactor = async () => {
    if (!clerkUser) return;
    setSecurityError(null);
    setEnablingTwoFactor(true);
    try {
      const totp = await clerkUser.createTOTP();
      setTwoFactorSecret(totp.secret ?? "");
      setTwoFactorStep("showQr");
    } catch (err) {
      setSecurityError(
        err instanceof Error ? err.message : "Failed to start 2FA setup",
      );
    } finally {
      setEnablingTwoFactor(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    if (!clerkUser || !totpCode.trim()) return;
    setSecurityError(null);
    setEnablingTwoFactor(true);
    try {
      await clerkUser.verifyTOTP({ code: totpCode });
      setTwoFactorStep("idle");
      setTotpCode("");
      await clerkUser.reload();
    } catch (err) {
      setSecurityError(
        err instanceof Error ? err.message : "Failed to verify 2FA code",
      );
    } finally {
      setEnablingTwoFactor(false);
    }
  };
  const canEdit = !!clerkUser;
  const displayName = clerkUser?.fullName || fallbackName;
  const activeTabLabel =
    profileTabDefs.find((tab) => tab.id === activeTab)?.label() ||
    profile_tab_profile();
  const hasPassword = clerkUser?.passwordEnabled;
  const hasTwoFactor = clerkUser?.twoFactorEnabled;
  const emailVerified =
    clerkUser?.primaryEmailAddress?.verification?.status === "verified";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <DialogPrimitive.Popup className="relative z-50 flex h-150 w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <div className="flex w-48 shrink-0 flex-col border-r border-border bg-muted/30">
              <div className="flex h-12 items-center px-4">
                <HugeiconsIcon
                  icon={UserCircleIcon}
                  className="mr-2 size-4 text-muted-foreground"
                />
                <span className="text-sm font-semibold text-foreground">
                  {profile_settings()}
                </span>
              </div>
              <nav className="flex-1 space-y-0.5 px-2 py-1">
                {profileTabDefs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        activeTab === tab.id
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <HugeiconsIcon icon={Icon} className="size-4" />
                      {tab.label()}
                    </button>
                  );
                })}
              </nav>
              <div className="flex h-24 items-center border-t border-border p-3">
                <div className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-card p-3">
                  {clerkUser?.imageUrl ? (
                    <img
                      src={clerkUser.imageUrl}
                      alt={displayName}
                      className="size-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {displayName.slice(0, 1).toUpperCase() || "U"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {displayEmail || profile_no_email()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-w-0 flex-1 flex-col"
            >
              <div className="flex h-12 items-center justify-between border-b border-border px-6">
                <div>
                  <DialogPrimitive.Title className="text-sm font-semibold text-foreground">
                    {activeTabLabel}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="sr-only">
                    {profile_basic_info_desc()}
                  </DialogPrimitive.Description>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onOpenChange(false)}
                  className="shrink-0 text-muted-foreground/60 hover:text-foreground"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M4 4L10 10M10 4L4 10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <div className="space-y-2 rounded-lg border border-border/50 p-4">
                      <div className="mb-1">
                        <p className="text-sm font-medium text-foreground">
                          {profile_basic_info()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {profile_basic_info_desc()}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-foreground">
                            {profile_first_name()}
                          </label>
                          <input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            disabled={!canEdit || saving}
                            aria-label={profile_first_name()}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-foreground">
                            {profile_last_name()}
                          </label>
                          <input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            disabled={!canEdit || saving}
                            aria-label={profile_last_name()}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                          {profile_username()}
                        </label>
                        <input
                          id="profile-username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          disabled={!canEdit || saving}
                          aria-label={profile_username()}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border border-border/50 p-4">
                      <div className="mb-1">
                        <p className="text-sm font-medium text-foreground">
                          {profile_login_email()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {profile_login_email_desc()}
                        </p>
                      </div>
                      <input
                        value={displayEmail}
                        readOnly
                        aria-label={profile_login_email()}
                        className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground focus:outline-none"
                      />
                    </div>

                    {error ? (
                      <p className="text-sm text-destructive">{error}</p>
                    ) : null}
                  </div>
                )}

                {activeTab === "security" && (
                  <div className="space-y-4">
                    <div className="space-y-2 rounded-lg border border-border/50 p-4">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon
                          icon={Key01Icon}
                          className="size-4 text-muted-foreground"
                        />
                        <p className="text-sm font-medium text-foreground">
                          {profile_security_section()}
                        </p>
                      </div>
                      {securityError ? (
                        <p className="text-sm text-destructive">
                          {securityError}
                        </p>
                      ) : null}
                      <div className="space-y-3 pt-1">
                        {/* Email Verification */}
                        <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-2.5">
                          <div>
                            <p className="text-sm text-foreground">
                              {profile_email_verification()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {profile_email_verification_desc()}
                            </p>
                          </div>
                          {emailVerified ? (
                            <span className="rounded-md px-2.5 py-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {profile_status_verified()}
                            </span>
                          ) : verificationCodeSent ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) =>
                                  setVerificationCode(e.target.value)
                                }
                                placeholder="000000"
                                maxLength={6}
                                aria-label="Verification code"
                                className="w-20 rounded-md border border-border bg-background px-2 py-1 text-center text-sm outline-none focus-visible:outline-dashed focus-visible:outline-[0.5px] focus-visible:outline-blue-500 focus-visible:outline-offset-2"
                              />
                              <button
                                type="button"
                                onClick={handleVerifyEmail}
                                disabled={
                                  verifyingEmail || !verificationCode.trim()
                                }
                                className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                              >
                                {verifyingEmail ? "…" : auth_verify_button()}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendVerificationCode}
                              disabled={verifyingEmail}
                              className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                              {verifyingEmail ? "…" : auth_verify_button()}
                            </button>
                          )}
                        </div>
                        {/* Password */}
                        <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-2.5">
                          <div>
                            <p className="text-sm text-foreground">
                              {profile_password_signin()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {profile_password_signin_desc()}
                            </p>
                          </div>
                          {hasPassword ? (
                            <span className="rounded-md px-2.5 py-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {profile_status_enabled()}
                            </span>
                          ) : addingPassword ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                aria-label="New password"
                                className="w-28 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus-visible:outline-dashed focus-visible:outline-[0.5px] focus-visible:outline-blue-500 focus-visible:outline-offset-2"
                              />
                              <button
                                type="button"
                                onClick={handleAddPassword}
                                disabled={saving || !newPassword.trim()}
                                className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                              >
                                {saving ? "…" : save()}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAddingPassword(true)}
                              className="rounded-md px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            >
                              + {profile_password_signin()}
                            </button>
                          )}
                        </div>
                        {/* Two-Factor */}
                        <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-2.5">
                          <div>
                            <p className="text-sm text-foreground">
                              {profile_two_factor()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {profile_two_factor_desc()}
                            </p>
                          </div>
                          {hasTwoFactor ? (
                            <span className="rounded-md px-2.5 py-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {profile_status_enabled()}
                            </span>
                          ) : twoFactorStep === "showQr" ? (
                            <div className="space-y-2">
                              {twoFactorSecret ? (
                                <>
                                  <p className="text-[10px] text-muted-foreground text-center">
                                    Scan with authenticator app
                                  </p>
                                  <div className="mx-auto flex size-24 items-center justify-center rounded-lg border border-border bg-white p-2">
                                    <img
                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(twoFactorSecret)}`}
                                      alt="2FA QR Code"
                                      className="size-20"
                                    />
                                  </div>
                                </>
                              ) : null}
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={totpCode}
                                  onChange={(e) => setTotpCode(e.target.value)}
                                  placeholder="000000"
                                  maxLength={6}
                                  aria-label="Two-factor authentication code"
                                  className="w-20 rounded-md border border-border bg-background px-2 py-1 text-center text-sm outline-none focus-visible:outline-dashed focus-visible:outline-[0.5px] focus-visible:outline-blue-500 focus-visible:outline-offset-2"
                                />
                                <button
                                  type="button"
                                  onClick={handleVerifyTwoFactor}
                                  disabled={
                                    enablingTwoFactor || !totpCode.trim()
                                  }
                                  className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                  {enablingTwoFactor
                                    ? "…"
                                    : auth_verify_button()}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleEnableTwoFactor}
                              disabled={enablingTwoFactor}
                              className="rounded-md px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            >
                              + {profile_two_factor()}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "membership" && (
                  <div className="space-y-4">
                    {/* Plan overview */}
                    <div className="rounded-lg border border-border/50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <HugeiconsIcon
                          icon={CrownIcon}
                          className="size-4 text-amber-500"
                        />
                        <p className="text-sm font-medium text-foreground">
                          {profile_membership_plan()}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        {profile_membership_plan_desc()}
                      </p>

                      {subLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Spinner size="sm" />
                        </div>
                      ) : subscription ? (
                        <div className="space-y-3">
                          {/* Token balance */}
                          <div className="rounded-lg border border-border/50 px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {profile_membership_credits()}
                              </span>
                              <span className="text-xs font-medium text-foreground">
                                {(subscription.creditsBalance || 0).toLocaleString()}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {profile_membership_credits_desc()}
                            </p>
                          </div>

                          {/* Tokens used */}
                          <div className="rounded-lg border border-border/50 px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {profile_membership_tokens_used()}
                              </span>
                              <span className="text-xs font-medium text-foreground">
                                {(
                                  subscription.tokensUsed || 0
                                ).toLocaleString()}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {profile_membership_tokens_used_desc()}
                            </p>
                          </div>

                          {/* Buy tokens CTA */}
                          {isProEnabled() && (
                            <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-foreground">
                                    {profile_membership_upgrade()}
                                  </p>
                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    {profile_membership_upgrade_desc()}
                                  </p>
                                </div>
                                <Button size="sm" asChild>
                                  <a href="/api/checkout">
                                    {profile_membership_upgrade()}
                                  </a>
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-sm text-muted-foreground">
                            {profile_membership_plan_desc()}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground/60">
                            Subscription info is not available.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Manage link */}
                    <div className="text-center pt-2">
                      <Link
                        to="/pricing"
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {profile_membership_manage()}
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex h-24 items-center justify-end gap-2 border-t border-border px-6 py-4">
                <DialogPrimitive.Close
                  render={<Button type="button" variant="outline" />}
                >
                  {cancel()}
                </DialogPrimitive.Close>
                <Button
                  type="submit"
                  disabled={activeTab !== "profile" || !canEdit || saving}
                >
                  {saving ? profile_saving() : save()}
                </Button>
              </div>
            </form>
          </DialogPrimitive.Popup>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
