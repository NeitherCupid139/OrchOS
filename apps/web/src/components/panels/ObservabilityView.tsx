import { useEffect, useMemo, useState } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Alert01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  FolderLibraryIcon,
} from "@hugeicons/core-free-icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { obs_active_issues, obs_activity_overview, obs_chart_critical, obs_chart_events, obs_chart_info, obs_chart_issues, obs_chart_warning, obs_event_breakdown, obs_event_timeline, obs_event_types, obs_events_and_issues, obs_issue_priority, obs_issues_needing_attention, obs_last_24h, obs_last_30d, obs_last_7d, obs_no_active_issues, obs_no_events, obs_open_issues, obs_priority_critical, obs_priority_info, obs_priority_warning, obs_recent_events, obs_resolved_issues, obs_total_events, observability, observability_desc } from "@/paraglide/messages";
import { api, type ObservabilityMetrics, type TimeSeriesPoint } from "@/lib/api";
import type { Problem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ObservabilityViewProps {
  problems: Problem[];
}

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

const PRIORITY_COLORS = ["var(--chart-5)", "var(--chart-3)", "var(--chart-1)"];

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString();
}

function formatDateLabel(ts: string): string {
  return new Date(ts).toLocaleDateString();
}

export function ObservabilityView({ problems }: ObservabilityViewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [throughputData, setThroughputData] = useState<TimeSeriesPoint[]>([]);
  const [metrics, setMetrics] = useState<ObservabilityMetrics | null>(null);

  useEffect(() => {
    api.getObservabilityThroughput(timeRange).then(setThroughputData).catch(console.error);
    api.getObservabilityMetrics(timeRange).then(setMetrics).catch(console.error);
  }, [timeRange]);

  const totalEvents = metrics?.totalEvents ?? 0;
  const openIssues = metrics?.openIssues ?? 0;
  const resolvedIssues = metrics?.resolvedIssues ?? 0;
  const eventTypeCounts = metrics?.eventTypeCounts ?? [];
  const recentEvents = metrics?.recentEvents ?? [];

  const criticalCount = problems.filter((p) => p.priority === "critical").length;
  const warningCount = problems.filter((p) => p.priority === "warning").length;
  const infoCount = problems.filter((p) => p.priority === "info").length;

  const timelineChartConfig = useMemo(() => ({
    events: { label: obs_chart_events(), color: "var(--chart-1)" },
    issues: { label: obs_chart_issues(), color: "var(--chart-2)" },
  } satisfies ChartConfig), []);

  const priorityChartConfig = useMemo(() => ({
    critical: { label: obs_chart_critical(), color: "var(--chart-5)" },
    warning: { label: obs_chart_warning(), color: "var(--chart-3)" },
    info: { label: obs_chart_info(), color: "var(--chart-1)" },
  } satisfies ChartConfig), []);

  const priorityData = useMemo(
    () => [
      { name: "Critical", value: criticalCount, fill: PRIORITY_COLORS[0] },
      { name: "Warning", value: warningCount, fill: PRIORITY_COLORS[1] },
      { name: "Info", value: infoCount, fill: PRIORITY_COLORS[2] },
    ],
    [criticalCount, warningCount, infoCount],
  );

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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard icon={FolderLibraryIcon} label={obs_total_events()} value={totalEvents} />
            <MetricCard icon={Alert01Icon} label={obs_open_issues()} value={openIssues} />
            <MetricCard icon={CheckmarkCircle01Icon} label={obs_resolved_issues()} value={resolvedIssues} />
            <MetricCard
              icon={Clock01Icon}
              label={obs_event_types()}
              value={eventTypeCounts.length}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{obs_activity_overview()}</CardTitle>
                <CardDescription className="text-xs">{obs_event_breakdown()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {eventTypeCounts.length > 0
                  ? eventTypeCounts.map((etc) => (
                      <div key={etc.type} className="flex items-center justify-between">
                        <span className="text-muted-foreground">{etc.type}</span>
                        <span className="font-medium tabular-nums">{etc.count}</span>
                      </div>
                    ))
                  : (
                    <div className="text-sm text-muted-foreground">{obs_no_events()}</div>
                  )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{obs_active_issues()}</CardTitle>
                <CardDescription className="text-xs">{obs_issues_needing_attention()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {problems.slice(0, 3).map((problem) => (
                  <div key={problem.id} className="rounded-lg border border-border/60 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {problem.priority}
                      </span>
                        <Badge variant="outline" className="text-[10px]">
                          {formatDateLabel(problem.createdAt)}
                        </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-foreground">{problem.title}</p>
                  </div>
                ))}
                {problems.length === 0
                  ? (
                    <div className="text-sm text-muted-foreground">{obs_no_active_issues()}</div>
                  )
                  : null}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">{obs_event_timeline()}</CardTitle>
                <CardDescription className="text-xs">{obs_events_and_issues()}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <ChartContainer config={timelineChartConfig} className="h-[240px] w-full">
                  <BarChart data={throughputData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval="preserveStartEnd" />
                    <YAxis tickLine={false} axisLine={false} fontSize={10} width={30} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="events" fill="var(--color-events)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="issues" fill="var(--color-issues)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{obs_issue_priority()}</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <ChartContainer config={priorityChartConfig} className="h-[200px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={priorityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      strokeWidth={2}
                      stroke="var(--background)"
                    >
                      {priorityData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[0] }} />
                    {obs_priority_critical({ count: criticalCount })}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[1] }} />
                    {obs_priority_warning({ count: warningCount })}
                  </span>
                  {infoCount > 0
                    ? (
                      <span className="flex items-center gap-1">
                        <span className="size-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[2] }} />
                        {obs_priority_info({ count: infoCount })}
                      </span>
                    )
                    : null}
                </div>
              </CardContent>
            </Card>
          </div>

          {recentEvents.length > 0
            ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{obs_recent_events()}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentEvents.slice(0, 10).map((ev) => (
                      <div key={ev.id} className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2">
                        <span className="size-2 shrink-0 rounded-full bg-primary/40" />
                        <span className="flex-1 truncate text-sm text-foreground">{ev.type}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatTimestamp(ev.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
            : null}
        </div>
      </div>
    </div>
  );
}
