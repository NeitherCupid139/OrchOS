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
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, PanelLeft, PanelRight, Settings02Icon } from "@hugeicons/core-free-icons";
import { accounts, add, close_activity_panel, open_activity_panel } from "@/paraglide/messages";
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
  children,
}: ToolbarProps) {
  return (
    <div className="relative flex h-11 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
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

      <div className="flex-1" />

      {children}

      <div className="flex items-center gap-2">
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
