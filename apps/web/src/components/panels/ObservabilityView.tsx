import { useEffect, useMemo, useState } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Cancel01Icon,
  CheckmarkCircle01Icon,
  CodeIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  obs_activity_heatmap,
  obs_agent_timeline,
  obs_chart_tokens,
  obs_chart_tool_calls,
  obs_failed_tool_calls,
  obs_heatmap_legend_high,
  obs_heatmap_legend_low,
  obs_heatmap_no_data,
  obs_heatmap_title,
  obs_last_24h,
  obs_last_7d,
  obs_last_30d,
  obs_no_agent_activity,
  obs_success_rate,
  obs_successful_tool_calls,
  obs_token_usage,
  obs_tool_calls,
  observability,
  observability_desc,
} from "@/paraglide/messages";
import {
  api,
  type ActivityHeatmapPoint,
  type AgentMetrics,
  type AgentTimelinePoint,
} from "@/lib/api";
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
import { useUIStore } from "@/lib/store";

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
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {value}
            </span>
            {sub ? (
              <span className="text-[10px] text-muted-foreground">{sub}</span>
            ) : null}
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

/* ── Color helpers ── */

function heatmapColor(value: number, max: number): string {
  if (max === 0 || value === 0) return "oklch(0.967 0.003 264)"; // gray-100
  const t = Math.min(value / max, 1);
  // blue → cyan → orange → coral gradient
  if (t < 0.25) {
    const s = t / 0.25;
    return `oklch(${0.93 - s * 0.08} ${0.02 + s * 0.06} ${240 - s * 40})`;
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return `oklch(${0.85 - s * 0.06} ${0.08 + s * 0.06} ${200 - s * 50})`;
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return `oklch(${0.79 - s * 0.08} ${0.14 + s * 0.06} ${150 - s * 70})`;
  } else {
    const s = (t - 0.75) / 0.25;
    return `oklch(${0.71 - s * 0.08} ${0.2 + s * 0.08} ${80 - s * 60})`;
  }
}

/* ── Heatmap sub-component ── */

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => String(i));

function ActivityHeatmap({ data }: { data: ActivityHeatmapPoint[] }) {
  // Build 7×24 grid
  const grid = useMemo(() => {
    const map = new Map<string, number>();
    for (const pt of data) {
      map.set(`${pt.dayOfWeek}-${pt.hour}`, pt.value);
    }
    // Default 0 for missing cells
    const rows: { day: number; label: string; cells: number[] }[] = [];
    for (let d = 0; d < 7; d++) {
      const cells: number[] = [];
      for (let h = 0; h < 24; h++) {
        cells.push(map.get(`${d}-${h}`) ?? 0);
      }
      rows.push({ day: d, label: DAY_LABELS[d], cells });
    }
    return rows;
  }, [data]);

  const maxValue = useMemo(
    () => Math.max(...data.map((p) => p.value), 1),
    [data],
  );

  const hasData = data.some((p) => p.value > 0);

  return (
    <div className="rounded-xl bg-card py-4 ring-1 ring-foreground/10">
      <h3 className="font-heading text-sm leading-snug font-medium text-foreground px-4">
        {obs_activity_heatmap()}
      </h3>

      {/* Heatmap grid */}
      <div className="mt-4 overflow-x-auto px-4">
        {!hasData ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {obs_heatmap_no_data()}
          </p>
        ) : (
          <div className="flex flex-col gap-px">
            {/* header — hour labels */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: "44px repeat(24, minmax(18px, 1fr))",
                gap: "2px",
              }}
            >
              <div /> {/* empty corner */}
              {HOUR_LABELS.map((h) => (
                <div
                  key={h}
                  className="text-center text-[10px] font-medium text-muted-foreground leading-none"
                >
                  {h}
                </div>
              ))}
            </div>

            {/* rows — one per day */}
            {grid.map((row) => (
              <div
                key={row.day}
                className="grid items-center"
                style={{
                  gridTemplateColumns: "44px repeat(24, minmax(18px, 1fr))",
                  gap: "2px",
                }}
              >
                <div className="pr-1 text-right text-[10px] font-medium text-muted-foreground leading-none">
                  {row.label}
                </div>
                {row.cells.map((val, h) => (
                  <div
                    key={h}
                    title={`${row.label} ${String(h).padStart(2, "0")}:00 — ${formatTokens(val)}`}
                    className="relative aspect-square rounded-[3px] transition-transform hover:scale-125 hover:ring-1 hover:ring-foreground/30"
                    style={{ backgroundColor: heatmapColor(val, maxValue) }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Color legend */}
        {hasData && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>{obs_heatmap_legend_low()}</span>
              <div className="flex gap-px">
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
                  <div
                    key={t}
                    className="size-3 rounded-[2px]"
                    style={{
                      backgroundColor: heatmapColor(t * maxValue, maxValue),
                    }}
                  />
                ))}
              </div>
              <span>{obs_heatmap_legend_high()}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {obs_heatmap_title()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ── */

export function ObservabilityView() {
  const timeRange = useUIStore((s) => s.observabilityTimeRange);
  const setTimeRange = useUIStore((s) => s.setObservabilityTimeRange);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics | null>(null);
  const [agentTimeline, setAgentTimeline] = useState<AgentTimelinePoint[]>([]);
  const [heatmapData, setHeatmapData] = useState<ActivityHeatmapPoint[]>([]);
  useEffect(() => {
    let cancelled = false;

    api
      .getAgentMetrics(timeRange)
      .then((data) => {
        if (!cancelled) setAgentMetrics(data);
      })
      .catch(console.error);
    api
      .getAgentTimeline(timeRange)
      .then((data) => {
        if (!cancelled) setAgentTimeline(data);
      })
      .catch(console.error);
    api
      .getActivityHeatmap(timeRange, "tokens")
      .then((data) => {
        if (!cancelled) setHeatmapData(data);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  // Agent metrics
  const totalToolCalls = agentMetrics?.totalToolCalls ?? 0;
  const successfulToolCalls = agentMetrics?.successfulToolCalls ?? 0;
  const failedToolCalls = agentMetrics?.failedToolCalls ?? 0;
  const totalTokens = agentMetrics?.totalTokens ?? 0;
  const successRate =
    totalToolCalls > 0
      ? Math.round((successfulToolCalls / totalToolCalls) * 100)
      : 0;

  const agentTimelineChartConfig = useMemo(
    () =>
      ({
        tokens: { label: obs_chart_tokens(), color: "var(--chart-3)" },
        toolCalls: { label: obs_chart_tool_calls(), color: "var(--chart-1)" },
      }) satisfies ChartConfig,
    [],
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {observability()}
              </h1>
              <p className="text-sm text-muted-foreground">
                {observability_desc()}
              </p>
            </div>
            <Tabs
              value={timeRange}
              onValueChange={(v) => setTimeRange(v as TimeRange)}
            >
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
              sub={
                successRate > 0
                  ? `${obs_success_rate()}: ${successRate}%`
                  : undefined
              }
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

          {/* ── Activity Heatmap ── */}
          <ActivityHeatmap data={heatmapData} />

          {/* ── Agent Timeline ── */}
          {agentTimeline.length > 0 ? (
            <div className="rounded-xl bg-card py-4 ring-1 ring-foreground/10">
              <div className="px-4">
                <h3 className="font-heading text-sm leading-snug font-medium text-foreground">
                  {obs_agent_timeline()}
                </h3>
              </div>
              <div className="px-4 pt-4">
                <ChartContainer
                  config={agentTimelineChartConfig}
                  className="h-[200px] w-full"
                >
                  <BarChart
                    data={agentTimeline}
                    margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      fontSize={10}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={10}
                      width={40}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="tokens"
                      fill="var(--color-tokens)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      dataKey="toolCalls"
                      fill="var(--color-toolCalls)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          ) : agentMetrics ? (
            <div className="text-sm text-muted-foreground">
              {obs_no_agent_activity()}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
