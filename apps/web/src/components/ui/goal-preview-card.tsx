import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Target01Icon,
  CheckmarkCircleIcon,
  CancelCircleIcon,
  Clock01Icon,
  FolderGitIcon,
  Add01Icon,
} from "@hugeicons/core-free-icons";
import { m } from "@/paraglide/messages";

// --- Mock Data ---
type GoalStatus = "active" | "completed" | "paused";

interface MockGoal {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  project: string;
  successCriteria: string[];
  constraints: string[];
  progress: number;
}

const mockGoals: MockGoal[] = [
  {
    id: "g-1",
    title: "Implement authentication system",
    description:
      "Build a complete auth system with JWT tokens, session management, and OAuth2 integration.",
    status: "active",
    project: "OrchOS Core",
    successCriteria: ["JWT refresh token rotation", "Session persistence", "OAuth2 login flow"],
    constraints: ["Use TypeScript", "No external auth services"],
    progress: 65,
  },
  {
    id: "g-2",
    title: "Add real-time collaboration",
    description:
      "Enable multiple users to collaborate on goals and states simultaneously via WebSocket.",
    status: "active",
    project: "OrchOS Core",
    successCriteria: ["WebSocket connections stable", "Conflict resolution", "Live cursors"],
    constraints: ["Max 100ms latency", "Handle 50 concurrent users"],
    progress: 30,
  },
  {
    id: "g-3",
    title: "Migrate to Bun runtime",
    description:
      "Migrate the server from Node.js to Bun for better performance and native TypeScript support.",
    status: "completed",
    project: "Infrastructure",
    successCriteria: [
      "All tests passing on Bun",
      "Memory usage reduced by 30%",
      "Startup time < 200ms",
    ],
    constraints: ["Zero downtime migration"],
    progress: 100,
  },
  {
    id: "g-4",
    title: "Build agent marketplace UI",
    description:
      "Create a marketplace where users can browse and install pre-built agent configurations.",
    status: "paused",
    project: "OrchOS Web",
    successCriteria: ["Agent cards with ratings", "One-click install", "Search & filter"],
    constraints: ["Mobile responsive"],
    progress: 15,
  },
];

const goalStatusColor: Record<GoalStatus, string> = {
  active: "bg-blue-500",
  completed: "bg-emerald-500",
  paused: "bg-amber-500",
};

const goalStatusLabel: Record<GoalStatus, string> = {
  active: m.goal_active(),
  completed: m.goal_completed(),
  paused: m.goal_paused(),
};

type GoalStatusFilter = "all" | GoalStatus;

export function GoalPreviewCard() {
  const [activeId, setActiveId] = useState<string | null>("g-1");
  const [statusFilter, setStatusFilter] = useState<GoalStatusFilter>("all");

  const filteredGoals = mockGoals.filter((g) => {
    if (statusFilter !== "all" && g.status !== statusFilter) return false;
    return true;
  });

  const activeGoal = mockGoals.find((g) => g.id === activeId);

  const goalCounts = {
    all: mockGoals.length,
    active: mockGoals.filter((g) => g.status === "active").length,
    completed: mockGoals.filter((g) => g.status === "completed").length,
    paused: mockGoals.filter((g) => g.status === "paused").length,
  };

  return (
    <div className="w-full h-full flex flex-col rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-border px-4 py-3 bg-background/50">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
            <HugeiconsIcon icon={Target01Icon} className="size-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">{m.goals()}</span>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1">
          {(["all", "active", "completed", "paused"] as GoalStatusFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                statusFilter === filter
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <span>{filter === "all" ? m.all() : goalStatusLabel[filter as GoalStatus]}</span>
              <span className="tabular-nums opacity-50">{goalCounts[filter]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body: List + Detail */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Goal List */}
        <div className="w-52 shrink-0 border-r border-border md:w-60">
          <ScrollArea className="h-full">
            <div className="p-1.5 space-y-0.5">
              {filteredGoals.map((goal) => {
                const isActive = goal.id === activeId;
                return (
                  <button
                    key={goal.id}
                    onClick={() => setActiveId(goal.id)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground/80 hover:bg-accent/50",
                    )}
                  >
                    <div className="flex items-center gap-1.5 pt-0.5 shrink-0">
                      <div className={cn("size-1.5 rounded-full", goalStatusColor[goal.status])} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[11px] font-medium truncate",
                          isActive && "text-accent-foreground",
                        )}
                      >
                        {goal.title}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">
                          {goalStatusLabel[goal.status]}
                        </Badge>
                        <span className="text-[8px] text-muted-foreground flex items-center gap-0.5">
                          <HugeiconsIcon icon={FolderGitIcon} className="size-2" />
                          {goal.project}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Goal Detail */}
        <div className="flex-1 overflow-y-auto">
          {activeGoal ? (
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg",
                    activeGoal.status === "active"
                      ? "bg-blue-500/10"
                      : activeGoal.status === "completed"
                        ? "bg-emerald-500/10"
                        : "bg-amber-500/10",
                  )}
                >
                  <HugeiconsIcon
                    icon={
                      activeGoal.status === "completed"
                        ? CheckmarkCircleIcon
                        : activeGoal.status === "paused"
                          ? CancelCircleIcon
                          : Clock01Icon
                    }
                    className={cn(
                      "size-4",
                      activeGoal.status === "active"
                        ? "text-blue-500"
                        : activeGoal.status === "completed"
                          ? "text-emerald-500"
                          : "text-amber-500",
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-foreground">{activeGoal.title}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge
                      variant="outline"
                      className="text-[8px] uppercase tracking-wider px-1 py-0"
                    >
                      {goalStatusLabel[activeGoal.status]}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{activeGoal.project}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground mb-4">{activeGoal.description}</p>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Progress
                  </span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {activeGoal.progress}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      activeGoal.status === "completed"
                        ? "bg-emerald-500"
                        : activeGoal.status === "paused"
                          ? "bg-amber-500"
                          : "bg-blue-500",
                    )}
                    style={{ width: `${activeGoal.progress}%` }}
                  />
                </div>
              </div>

              {/* Success Criteria */}
              <div className="mb-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {m.success_criteria()}
                </p>
                <div className="space-y-1">
                  {activeGoal.successCriteria.map((c, i) => (
                    <div key={c} className="flex items-center gap-1.5 text-xs text-foreground">
                      <div
                        className={cn(
                          "size-3.5 shrink-0 rounded flex items-center justify-center",
                          activeGoal.progress > (i / activeGoal.successCriteria.length) * 100
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <HugeiconsIcon icon={CheckmarkCircleIcon} className="size-2.5" />
                      </div>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Constraints */}
              {activeGoal.constraints.length > 0 && (
                <div className="mb-4">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {m.constraints()}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {activeGoal.constraints.map((c) => (
                      <Badge key={c} variant="outline" className="text-[8px] px-1.5 py-0 h-4">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                <HugeiconsIcon icon={Add01Icon} className="size-3" />
                {m.create_goal()}
              </Link>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto size-10 rounded-full bg-muted/30 flex items-center justify-center mb-2">
                  <HugeiconsIcon icon={Target01Icon} className="size-4 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground">{m.no_goal_selected()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
