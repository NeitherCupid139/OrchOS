import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { type AgentModelFilter } from "@/components/layout/AgentModelTabs";
import { CalendarViewTabs, type CalendarViewMode } from "@/components/layout/CalendarViewTabs";
import { BoardFilterBar } from "@/components/panels/BoardFilterBar";
import type { BoardTaskFilter } from "@/components/panels/BoardView";
import { CapabilityModeTabs } from "@/components/layout/CapabilityModeTabs";
import { MailFolderTabs, type MailFolderFilter } from "@/components/layout/MailFolderTabs";
import {
  InboxStatusTabs,
  type InboxStatusFilter,
} from "@/components/layout/InboxStatusTabs";
import {
  InboxSourceTabs,
  type SourceFilter,
} from "@/components/layout/InboxSourceTabs";
import { NotificationPopover } from "@/components/panels/NotificationPopover";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, PanelLeft, PanelRight, Settings02Icon, CodeIcon } from "@hugeicons/core-free-icons";
import { accounts, add, close_activity_panel, open_activity_panel } from "@/paraglide/messages";
import { cn } from "@/lib/utils";
import type { SidebarView } from "@/lib/types";
import {
  isCapabilityView,
  type CapabilityViewMode,
} from "@/lib/capability-routing";
export type ScopeFilter = "all" | "global" | "project";
export type { AgentModelFilter };

interface ToolbarProps {
  activeView: SidebarView;
  loading?: boolean;
  activityPanelOpen: boolean;
  onToggleActivityPanel: () => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  sourceFilter: SourceFilter;
  onSourceFilterChange: (filter: SourceFilter) => void;
  inboxStatusFilter: InboxStatusFilter;
  onInboxStatusFilterChange: (filter: InboxStatusFilter) => void;
  mailFolderFilter: MailFolderFilter;
  onMailFolderFilterChange: (filter: MailFolderFilter) => void;
  calendarViewMode: CalendarViewMode;
  onCalendarViewModeChange: (mode: CalendarViewMode) => void;
  inboxCounts: {
    all: number;
    github_pr: number;
    github_issue: number;
    mention: number;
    agent_request: number;
  };
  agentModelFilter: AgentModelFilter;
  onAgentModelFilterChange: (filter: AgentModelFilter) => void;
  agentModelCounts: { all: number; local: number; cloud: number };
  capabilityViewMode?: CapabilityViewMode;
  onCapabilityViewModeChange?: (mode: CapabilityViewMode) => void;
  boardFilter?: BoardTaskFilter;
  onBoardFilterChange?: (filter: BoardTaskFilter) => void;
  onOpenCreateGoal?: () => void;
  onOpenMailAccounts?: () => void;
  onRefresh?: () => void | Promise<void>;
  agentsView?: string;
  onAgentsViewChange?: (view: string) => void;
  onToggleMobileSidebar?: () => void;
  children?: React.ReactNode;
}

export function Toolbar({
  activeView,
  activityPanelOpen,
  onToggleActivityPanel,
  sourceFilter,
  onSourceFilterChange,
  inboxStatusFilter,
  onInboxStatusFilterChange,
  mailFolderFilter,
  onMailFolderFilterChange,
  calendarViewMode,
  onCalendarViewModeChange,
  inboxCounts,
  agentModelFilter: _agentModelFilter,
  onAgentModelFilterChange: _onAgentModelFilterChange,
  agentModelCounts: _agentModelCounts,
  capabilityViewMode = "mine",
  onCapabilityViewModeChange,
  boardFilter = "all",
  onBoardFilterChange,
  onOpenCreateGoal,
  onOpenMailAccounts,
  agentsView,
  onAgentsViewChange,
  onToggleMobileSidebar,
  children,
}: ToolbarProps) {
  const hamburgerButton = onToggleMobileSidebar && (
    <button
      type="button"
      onClick={onToggleMobileSidebar}
      aria-label="Open sidebar"
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M2 5H16M2 9H16M2 13H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </button>
  );

  const filtersContent = (
    <>
      {activeView === "inbox" && (
        <>
          <InboxStatusTabs
            value={inboxStatusFilter}
            onChange={onInboxStatusFilterChange}
          />
          <InboxSourceTabs
            value={sourceFilter}
            counts={inboxCounts}
            onChange={onSourceFilterChange}
          />
        </>
      )}

      {activeView === "mail" ? (
        <MailFolderTabs value={mailFolderFilter} onChange={onMailFolderFilterChange} />
      ) : null}

      {activeView === "calendar" ? (
        <CalendarViewTabs value={calendarViewMode} onChange={onCalendarViewModeChange} />
      ) : null}

      {activeView === "board" && onBoardFilterChange ? (
        <BoardFilterBar
          boardFilter={boardFilter}
          onBoardFilterChange={onBoardFilterChange}
        />
      ) : null}

      {isCapabilityView(activeView) && onCapabilityViewModeChange ? (
        <CapabilityModeTabs
          view={activeView}
          mode={capabilityViewMode}
          onModeChange={onCapabilityViewModeChange}
        />
      ) : null}

      {activeView === "agents" && onAgentsViewChange ? (
        <div className="flex items-center gap-1.5 px-1">
          <button
            type="button"
            onClick={() => onAgentsViewChange("config")}
            aria-pressed={agentsView !== "observability"}
            className={cn(
              "inline-flex h-7 cursor-pointer items-center gap-2 rounded-full border px-3 text-[11px] font-medium transition-colors",
              agentsView !== "observability"
                ? "border-transparent bg-sky-500/5 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400"
                : "border-border/50 bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            <HugeiconsIcon icon={Settings02Icon} className={cn("size-3.5", agentsView !== "observability" ? "text-sky-600 dark:text-sky-400" : "")} />
            配置
          </button>
          <button
            type="button"
            onClick={() => onAgentsViewChange("observability")}
            aria-pressed={agentsView === "observability"}
            className={cn(
              "inline-flex h-7 cursor-pointer items-center gap-2 rounded-full border px-3 text-[11px] font-medium transition-colors",
              agentsView === "observability"
                ? "border-transparent bg-violet-500/5 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400"
                : "border-border/50 bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            <HugeiconsIcon icon={CodeIcon} className={cn("size-3.5", agentsView === "observability" ? "text-violet-600 dark:text-violet-400" : "")} />
            观测
          </button>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="relative flex h-11 shrink-0 items-center gap-2 border-b border-border bg-background px-2 md:px-4">
      {hamburgerButton}
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {filtersContent}
      </div>
      {children}
      <div className="flex shrink-0 items-center gap-2">
        {activeView === "board" && onOpenCreateGoal ? (
          <Tooltip>
            <TooltipTrigger
              render={(props) => (
                <Button {...props} variant="ghost" size="icon-sm" onClick={onOpenCreateGoal}>
                  <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
                </Button>
              )}
            />
            <TooltipContent side="bottom">{add()}</TooltipContent>
          </Tooltip>
        ) : null}

        <NotificationPopover />

        {activeView === "mail" ? (
          <Button variant="outline" size="sm" onClick={onOpenMailAccounts}>
            <HugeiconsIcon icon={Settings02Icon} className="size-3.5" />
            {accounts()}
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={(props) => (
                <Button
                  {...props}
                  variant="outline"
                  size="icon-sm"
                  onClick={onToggleActivityPanel}
                >
                  {activityPanelOpen ? (
                    <HugeiconsIcon icon={PanelLeft} className="size-4" />
                  ) : (
                    <HugeiconsIcon icon={PanelRight} className="size-4" />
                  )}
                </Button>
              )}
            />
            <TooltipContent side="bottom">
              {activityPanelOpen ? close_activity_panel() : open_activity_panel()}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
