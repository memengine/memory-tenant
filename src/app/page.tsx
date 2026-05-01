"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import {
  Activity,
  CheckCircle,
  Database,
  GitMerge,
  ShieldAlert,
  Users,
} from "lucide-react";

import { GateDonutChart } from "@/components/charts/gate-donut-chart";
import { MemoryLineChart } from "@/components/charts/memory-line-chart";
import { MetricCard } from "@/components/metric-card";
import { QuotaBar } from "@/components/quota-bar";
import { SdkQuickstart } from "@/components/sdk-quickstart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ApiRequestError,
  type QuotaMode,
  getAllTenantUsers,
  getGateBreakdown,
  getMemoryAdditions,
  getRecentActivity,
  getTenantUsage,
} from "@/lib/api";

function ErrorCard({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <Card className="border border-rose-200 bg-rose-50/70">
      <CardHeader>
        <CardTitle className="text-rose-950">{title}</CardTitle>
        <CardDescription className="text-rose-800">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

function SectionSkeleton({ className = "" }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-44 animate-pulse rounded bg-slate-200" />
      </CardHeader>
      <CardContent>
        <div className="h-56 animate-pulse rounded-2xl bg-slate-200" />
      </CardContent>
    </Card>
  );
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusClassName(status: "queued" | "blocked" | "passthrough") {
  if (status === "blocked") {
    return "border-rose-200 bg-rose-100 text-rose-800";
  }
  if (status === "passthrough") {
    return "border-amber-200 bg-amber-100 text-amber-800";
  }
  return "border-emerald-200 bg-emerald-100 text-emerald-800";
}

function getStatusLabel(status: "queued" | "blocked" | "passthrough") {
  if (status === "passthrough") {
    return "Passthrough";
  }
  if (status === "blocked") {
    return "Blocked";
  }
  return "Queued";
}

type UsageWithEngineMetrics = {
  conflicts_resolved_mtd?: number;
  extraction_success_rate?: number;
};

function EngineMetricCard({
  title,
  value,
  description,
  icon: Icon,
  loading,
  error,
  onRetry,
  tooltip,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof GitMerge;
  loading: boolean;
  error?: string;
  onRetry: () => void;
  tooltip: string;
  tone: "gray" | "purple" | "green" | "amber" | "red";
}) {
  const toneClassName =
    tone === "purple"
      ? "bg-purple-100 text-purple-700"
      : tone === "green"
        ? "bg-emerald-100 text-emerald-700"
        : tone === "amber"
          ? "bg-amber-100 text-amber-700"
          : tone === "red"
            ? "bg-rose-100 text-rose-700"
            : "bg-slate-100 text-slate-700";

  return (
    <Card className="min-h-[170px]" title={tooltip}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-base text-slate-950">{title}</CardTitle>
        </div>
        <div className={`rounded-xl p-2.5 ${toneClassName}`}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end">
        {loading ? (
          <div className="space-y-3">
            <div className="h-8 w-28 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          </div>
        ) : error ? (
          <div className="space-y-3">
            <div className="text-sm font-medium text-rose-700">{error}</div>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-3xl font-semibold tracking-tight text-slate-950">
              {value}
            </div>
            <p className="text-sm text-slate-600">{description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OverviewPage() {
  const { isLoaded, getToken } = useAuth();
  const [renderedAt] = useState(() => Date.now());
  const swrKeyReady = isLoaded ? "ready" : null;

  const usage = useSWR(
    swrKeyReady ? "tenant-usage" : null,
    () => getTenantUsage(getToken),
    { refreshInterval: 30_000 },
  );

  const users = useSWR(
    swrKeyReady ? "tenant-users" : null,
    () => getAllTenantUsers(getToken),
    { refreshInterval: 30_000 },
  );

  const additions = useSWR(
    swrKeyReady ? "memory-additions" : null,
    () => getMemoryAdditions(getToken),
    { refreshInterval: 30_000 },
  );

  const gateBreakdown = useSWR(
    swrKeyReady ? "gate-breakdown" : null,
    () => getGateBreakdown(getToken),
    { refreshInterval: 30_000 },
  );

  const recentActivity = useSWR(
    swrKeyReady && usage.data ? ["recent-activity", usage.data.mode] : null,
    ([, mode]: [string, QuotaMode]) => getRecentActivity(getToken, mode),
    { refreshInterval: 30_000 },
  );

  const metrics = useMemo(() => {
    const allUsers = users.data ?? [];
    const memoriesStored = allUsers.reduce(
      (sum, user) => sum + user.memory_count,
      0,
    );
    const thirtyDaysAgo = renderedAt - 30 * 24 * 60 * 60 * 1000;
    const activeUsers30d = allUsers.filter((user) => {
      if (!user.last_active_at) {
        return false;
      }
      const value = new Date(user.last_active_at).getTime();
      return !Number.isNaN(value) && value >= thirtyDaysAgo;
    }).length;

    const quotaUsedPct = usage.data
      ? Math.max(
          0,
          Math.min(100, (1 - (usage.data.budget_remaining_pct ?? 0)) * 100),
        )
      : 0;

    const gateTotals = (gateBreakdown.data ?? []).reduce(
      (sum, slice) => sum + slice.value,
      0,
    );
    const additionTotals = (additions.data ?? []).reduce(
      (sum, point) => sum + point.count,
      0,
    );
    const gateBlockRate =
      additionTotals + gateTotals > 0
        ? (gateTotals / (additionTotals + gateTotals)) * 100
        : 0;

    return {
      memoriesStored,
      quotaUsedPct,
      activeUsers30d,
      gateBlockRate,
      conflictsResolvedMtd:
        (usage.data as (typeof usage.data & UsageWithEngineMetrics) | undefined)
          ?.conflicts_resolved_mtd ?? 0,
      extractionSuccessRate:
        (usage.data as (typeof usage.data & UsageWithEngineMetrics) | undefined)
          ?.extraction_success_rate ?? 0,
    };
  }, [additions.data, gateBreakdown.data, renderedAt, usage.data, users.data]);

  const usageError = usage.error as ApiRequestError | undefined;
  const usersError = users.error as ApiRequestError | undefined;

  return (
    <div className="flex flex-col gap-6 pt-14 md:pt-0">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
          Tenant Overview
        </span>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              MemoryOS control surface
            </h1>
            <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
              Monitor tenant usage, memory growth, and quality gate behavior in
              one place.
            </p>
          </div>
        </div>
      </div>

      {usage.data?.mode === "PASSTHROUGH" ? (
        <Card className="border border-rose-200 bg-rose-50 text-rose-950">
          <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Memory writes are in passthrough mode</div>
              <div className="text-sm text-rose-900/80">
                Quota is exhausted or the system is degraded. Your app should
                keep running, but new memories will not be stored until capacity
                returns.
              </div>
            </div>
            <Button className="w-full sm:w-auto">Upgrade Plan</Button>
          </CardContent>
        </Card>
      ) : null}

      {usage.data?.mode === "DEGRADED_RETRIEVE" ? (
        <Card className="border border-amber-200 bg-amber-50 text-amber-950">
          <CardContent className="py-5">
            <div className="text-sm font-semibold">New memories paused</div>
            <div className="mt-1 text-sm text-amber-900/80">
              Retrieval is running in a degraded mode. MemoryOS is still serving
              requests, but fresh writes may be temporarily delayed.
            </div>
          </CardContent>
        </Card>
      ) : null}

      <SdkQuickstart emptyState={metrics.memoriesStored === 0} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Memories Stored"
          value={metrics.memoriesStored.toLocaleString("en-IN")}
          description="Total memories indexed for this tenant"
          icon={Database}
          loading={users.isLoading && !users.data}
          error={usersError?.message}
          onRetry={() => void users.mutate()}
        />
        <MetricCard
          title="Quota Used %"
          value={formatPercent(metrics.quotaUsedPct)}
          description="Rolling monthly API budget consumption"
          icon={Activity}
          loading={usage.isLoading && !usage.data}
          error={usageError?.message}
          onRetry={() => void usage.mutate()}
        />
        <MetricCard
          title="Active Users (30d)"
          value={metrics.activeUsers30d.toLocaleString("en-IN")}
          description="Users with memory activity in the last 30 days"
          icon={Users}
          loading={users.isLoading && !users.data}
          error={usersError?.message}
          onRetry={() => void users.mutate()}
        />
        <MetricCard
          title="Gate Block Rate"
          value={formatPercent(metrics.gateBlockRate)}
          description="Share of recent activity stopped by the quality gate"
          icon={ShieldAlert}
          loading={
            (additions.isLoading && !additions.data) ||
            (gateBreakdown.isLoading && !gateBreakdown.data)
          }
          error={
            (additions.error as ApiRequestError | undefined)?.message ??
            (gateBreakdown.error as ApiRequestError | undefined)?.message
          }
          onRetry={() => {
            void additions.mutate();
            void gateBreakdown.mutate();
          }}
        />
        <EngineMetricCard
          title="Conflicts Resolved"
          value={metrics.conflictsResolvedMtd.toLocaleString("en-IN")}
          description="this month - memory kept accurate"
          icon={GitMerge}
          loading={usage.isLoading && !usage.data}
          error={usageError?.message}
          onRetry={() => void usage.mutate()}
          tooltip="When a new memory contradicts an existing one, MemoryOS resolves the conflict automatically."
          tone={metrics.conflictsResolvedMtd > 0 ? "purple" : "gray"}
        />
        <EngineMetricCard
          title="Extraction Success Rate"
          value={formatPercent(metrics.extractionSuccessRate * 100)}
          description="of add() calls produced memories"
          icon={CheckCircle}
          loading={usage.isLoading && !usage.data}
          error={usageError?.message}
          onRetry={() => void usage.mutate()}
          tooltip="The percentage of queued add() calls that successfully extracted at least one memory."
          tone={
            metrics.extractionSuccessRate > 0.7
              ? "green"
              : metrics.extractionSuccessRate >= 0.5
                ? "amber"
                : "red"
          }
        />
      </section>

      <QuotaBar
        loading={usage.isLoading && !usage.data}
        error={usageError?.message}
        percentUsed={metrics.quotaUsedPct}
        mode={usage.data?.mode ?? "FULL"}
        callsUsed={usage.data?.calls_used}
        callsLimit={usage.data?.calls_limit}
        onRetry={() => void usage.mutate()}
      />

      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <MemoryLineChart
          data={additions.data ?? []}
          loading={additions.isLoading && !additions.data}
          error={(additions.error as ApiRequestError | undefined)?.message}
          onRetry={() => void additions.mutate()}
        />
        <GateDonutChart
          data={gateBreakdown.data ?? []}
          loading={gateBreakdown.isLoading && !gateBreakdown.data}
          error={(gateBreakdown.error as ApiRequestError | undefined)?.message}
          onRetry={() => void gateBreakdown.mutate()}
        />
      </section>

      {recentActivity.isLoading && !recentActivity.data ? (
        <SectionSkeleton className="min-h-[320px]" />
      ) : recentActivity.error ? (
        <ErrorCard
          title="Unable to load recent activity"
          description={
            (recentActivity.error as ApiRequestError).message ??
            "The recent activity feed is temporarily unavailable."
          }
          onRetry={() => void recentActivity.mutate()}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Last 10 add() requests observed in the tenant quality stream.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recentActivity.data ?? []).length > 0 ? (
                  recentActivity.data?.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-slate-600">
                        {formatRelativeTime(row.time)}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        {row.user}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusClassName(row.status)}
                        >
                          {getStatusLabel(row.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      className="py-10 text-center text-slate-500"
                      colSpan={3}
                    >
                      No recent tenant activity yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
