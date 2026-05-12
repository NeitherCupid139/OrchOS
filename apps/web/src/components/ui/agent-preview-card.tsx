import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Robot02Icon, CodeIcon, CloudIcon, Clock01Icon } from "@hugeicons/core-free-icons";
import { active, agent_capabilities, agent_model, agent_role, agents, all, cap_commit, cap_fix_bug, cap_review, cap_run_tests, cap_write_code, command_label, create_agent, idle_status, model_cloud, model_local, no_agent_selected, status_error } from "@/paraglide/messages";

// --- Mock Data ---
type AgentStatus = "idle" | "active" | "error";

interface MockAgent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  model: string;
  modelType: "local" | "cloud";
  capabilities: string[];
  enabled: boolean;
  currentTask?: string;
}

const mockAgents: MockAgent[] = [
  {
    id: "a-1",
    name: "CodeAgent",
    role: "Code generation & modification",
    status: "active",
    model: "cloud/claude-sonnet-4",
    modelType: "cloud",
    capabilities: ["write_code", "fix_bug", "run_tests"],
    enabled: true,
    currentTask: "Implementing auth module (g-1)",
  },
  {
    id: "a-2",
    name: "ReviewAgent",
    role: "Code review & suggestions",
    status: "idle",
    model: "cloud/gpt-4o",
    modelType: "cloud",
    capabilities: ["review", "commit"],
    enabled: true,
  },
  {
    id: "a-3",
    name: "TestAgent",
    role: "Test runner & coverage analysis",
    status: "active",
    model: "local/llama-3.1",
    modelType: "local",
    capabilities: ["run_tests", "fix_bug"],
    enabled: true,
    currentTask: "Running integration tests (g-1)",
  },
  {
    id: "a-4",
    name: "OpsAgent",
    role: "Deployment & infrastructure",
    status: "idle",
    model: "cloud/claude-sonnet-4",
    modelType: "cloud",
    capabilities: ["write_code", "commit", "review"],
    enabled: true,
  },
];

const agentStatusColor: Record<AgentStatus, string> = {
  idle: "bg-muted-foreground",
  active: "bg-emerald-500",
  error: "bg-red-500",
};

const agentStatusLabel: Record<AgentStatus, string> = {
  idle: idle_status(),
  active: active(),
  error: status_error(),
};

const capLabelMap: Record<string, string> = {
  write_code: cap_write_code(),
  fix_bug: cap_fix_bug(),
  run_tests: cap_run_tests(),
  commit: cap_commit(),
  review: cap_review(),
};

type ModelFilter = "all" | "local" | "cloud";

export function AgentPreviewCard() {
  const [activeId, setActiveId] = useState<string | null>("a-1");
  const [modelFilter, setModelFilter] = useState<ModelFilter>("all");

  const filteredAgents = mockAgents.filter((a) => {
    if (modelFilter !== "all" && a.modelType !== modelFilter) return false;
    return true;
  });

  const activeAgent = mockAgents.find((a) => a.id === activeId);

  const agentCounts = {
    all: mockAgents.length,
    local: mockAgents.filter((a) => a.modelType === "local").length,
    cloud: mockAgents.filter((a) => a.modelType === "cloud").length,
  };

  return (
    <div className="w-full h-full flex flex-col rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-border px-4 py-3 bg-background/50">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
            <HugeiconsIcon icon={Robot02Icon} className="size-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">{agents()}</span>
        </div>

        {/* Model Filter Tabs */}
        <div className="flex items-center gap-1">
          {(["all", "local", "cloud"] as ModelFilter[]).map((filter) => {
            const Icon = filter === "local" ? CodeIcon : filter === "cloud" ? CloudIcon : null;
            return (
              <button
                key={filter}
                onClick={() => setModelFilter(filter)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                  modelFilter === filter
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                {Icon && <HugeiconsIcon icon={Icon} className="size-2.5" />}
                <span>
                  {filter === "all"
                    ? all()
                    : filter === "local"
                      ? model_local()
                      : model_cloud()}
                </span>
                <span className="tabular-nums opacity-50">{agentCounts[filter]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Body: List + Detail */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Agent List */}
        <div className="w-52 shrink-0 border-r border-border md:w-60">
          <ScrollArea className="h-full">
            <div className="p-1.5 space-y-0.5">
              {filteredAgents.map((agent) => {
                const isActive = agent.id === activeId;
                return (
                  <button
                    key={agent.id}
                    onClick={() => setActiveId(agent.id)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground/80 hover:bg-accent/50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                        isActive ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary",
                      )}
                    >
                      {agent.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[11px] font-medium truncate",
                          isActive && "text-accent-foreground",
                        )}
                      >
                        {agent.name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div
                          className={cn("size-1.5 rounded-full", agentStatusColor[agent.status])}
                        />
                        <span className="text-[8px] text-muted-foreground">
                          {agentStatusLabel[agent.status]}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Agent Detail */}
        <div className="flex-1 overflow-y-auto">
          {activeAgent ? (
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg text-sm font-bold",
                    activeAgent.status === "active"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : activeAgent.status === "error"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-primary/10 text-primary",
                  )}
                >
                  {activeAgent.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{activeAgent.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div
                      className={cn("size-1.5 rounded-full", agentStatusColor[activeAgent.status])}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {agentStatusLabel[activeAgent.status]}
                    </span>
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">
                      {activeAgent.modelType === "local" ? model_local() : model_cloud()}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Role */}
              <div className="mb-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {agent_role()}
                </p>
                <p className="text-xs text-foreground">{activeAgent.role}</p>
              </div>

              {/* Model */}
              <div className="mb-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {agent_model()}
                </p>
                <div className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1">
                  <HugeiconsIcon
                    icon={activeAgent.modelType === "local" ? CodeIcon : CloudIcon}
                    className={cn(
                      "size-3",
                      activeAgent.modelType === "local" ? "text-blue-500" : "text-purple-500",
                    )}
                  />
                  <span className="text-[11px] font-mono text-foreground">{activeAgent.model}</span>
                </div>
              </div>

              {/* Capabilities */}
              <div className="mb-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {agent_capabilities()}
                </p>
                <div className="flex flex-wrap gap-1">
                  {activeAgent.capabilities.map((cap) => (
                    <Badge key={cap} variant="outline" className="text-[8px] px-1.5 py-0 h-4">
                      {capLabelMap[cap] || cap}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Current Task */}
              {activeAgent.currentTask && (
                <div className="mb-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {command_label()}
                  </p>
                  <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5">
                    <HugeiconsIcon icon={Clock01Icon} className="size-3 shrink-0 text-primary/60" />
                    <span className="text-xs font-medium text-primary">
                      {activeAgent.currentTask}
                    </span>
                  </div>
                </div>
              )}

              {/* CTA */}
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                <HugeiconsIcon icon={Robot02Icon} className="size-3" />
                {create_agent()}
              </Link>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto size-10 rounded-full bg-muted/30 flex items-center justify-center mb-2">
                  <HugeiconsIcon icon={Robot02Icon} className="size-4 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground">{no_agent_selected()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
