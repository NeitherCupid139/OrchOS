import { useEffect, useMemo, useState } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Cancel01Icon,
  CheckmarkCircle01Icon,
  CodeIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { obs_agent_timeline, obs_chart_tokens, obs_chart_tool_calls, obs_failed_tool_calls, obs_last_24h, obs_last_30d, obs_last_7d, obs_no_agent_activity, obs_success_rate, obs_successful_tool_calls, obs_token_usage, obs_tool_calls, observability, observability_desc } from "@/paraglide/messages";
import { api, type AgentMetrics, type AgentTimelinePoint } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TimeRange = "24h" | "7d" | "30d";

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: IconSvgElement;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={Icon} className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold tabular-nums text-foreground">{value}</span>
            {sub ? <span className="text-[10px] text-muted-foreground">{sub}</span> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function ObservabilityView() {
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics | null>(null);
  const [agentTimeline, setAgentTimeline] = useState<AgentTimelinePoint[]>([]);

  useEffect(() => {
    api.getAgentMetrics(timeRange).then(setAgentMetrics).catch(console.error);
    api.getAgentTimeline(timeRange).then(setAgentTimeline).catch(console.error);
  }, [timeRange]);

  // Agent metrics
  const totalToolCalls = agentMetrics?.totalToolCalls ?? 0;
  const successfulToolCalls = agentMetrics?.successfulToolCalls ?? 0;
  const failedToolCalls = agentMetrics?.failedToolCalls ?? 0;
  const totalTokens = agentMetrics?.totalTokens ?? 0;
  const successRate = totalToolCalls > 0 ? Math.round((successfulToolCalls / totalToolCalls) * 100) : 0;

  const agentTimelineChartConfig = useMemo(() => ({
    tokens: { label: obs_chart_tokens(), color: "var(--chart-3)" },
    toolCalls: { label: obs_chart_tool_calls(), color: "var(--chart-1)" },
  } satisfies ChartConfig), []);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground">{observability()}</h1>
              <p className="text-sm text-muted-foreground">{observability_desc()}</p>
            </div>
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <TabsList>
                <TabsTrigger value="24h">{obs_last_24h()}</TabsTrigger>
                <TabsTrigger value="7d">{obs_last_7d()}</TabsTrigger>
                <TabsTrigger value="30d">{obs_last_30d()}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* ── Agent Metrics ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard
                icon={Wrench01Icon}
                label={obs_tool_calls()}
                value={totalToolCalls}
                sub={successRate > 0 ? `${obs_success_rate()}: ${successRate}%` : undefined}
              />
              <MetricCard
                icon={CheckmarkCircle01Icon}
                label={obs_successful_tool_calls()}
                value={successfulToolCalls}
              />
              <MetricCard
                icon={Cancel01Icon}
                label={obs_failed_tool_calls()}
                value={failedToolCalls}
              />
              <MetricCard
                icon={CodeIcon}
                label={obs_token_usage()}
                value={formatTokens(totalTokens)}
              />
            </div>

          {/* ── Agent Timeline ── */}
          {agentTimeline.length > 0
            ? (
              <div className="rounded-xl bg-card py-4 ring-1 ring-foreground/10">
                <div className="px-4">
                  <h3 className="font-heading text-sm leading-snug font-medium text-foreground">{obs_agent_timeline()}</h3>
                </div>
                <div className="px-4 pt-4">
                  <ChartContainer config={agentTimelineChartConfig} className="h-[200px] w-full">
                    <BarChart data={agentTimeline} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval="preserveStartEnd" />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} width={40} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="tokens" fill="var(--color-tokens)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="toolCalls" fill="var(--color-toolCalls)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            )
            : agentMetrics
              ? (
                <div className="text-sm text-muted-foreground">{obs_no_agent_activity()}</div>
              )
              : null}
        </div>
      </div>
    </div>
  );
}
