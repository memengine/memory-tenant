"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import {
  Archive,
  Brain,
  Flame,
  FolderOpen,
  History,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { MemoryHistorySlideover } from "@/components/memory-history-slideover";
import { MetricCard } from "@/components/metric-card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ApiRequestError,
  type MemoryRecord,
  type PaginatedResponse,
  type TokenGetter,
} from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

type TimeRangeValue = "all" | "7" | "30" | "90";

type MemoryExplorerRecord = MemoryRecord & {
  original_importance_score?: number | null;
  is_hot?: boolean;
  system_archived?: boolean;
  source_job_id?: string | null;
};

const TIME_RANGE_OPTIONS: Array<{ label: string; value: TimeRangeValue }> = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
];

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function truncateContent(value: string): string {
  if (value.length <= 88) {
    return value;
  }
  return `${value.slice(0, 85)}...`;
}

async function fetchMemories(
  getToken: TokenGetter,
  options: { limit: number; timeRange: TimeRangeValue },
): Promise<PaginatedResponse<MemoryExplorerRecord>> {
  if (!API_BASE) {
    throw new ApiRequestError("NEXT_PUBLIC_API_BASE is not configured.", 500);
  }

  const search = new URLSearchParams({ limit: String(options.limit) });
  if (options.timeRange !== "all") {
    search.set("time_filter_days", options.timeRange);
  }

  const token = await getToken();
  const response = await fetch(`${API_BASE}/v1/memories?${search.toString()}`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string; detail?: string };
      message = payload.error ?? payload.detail ?? message;
    } catch {
      // Keep the default message.
    }
    throw new ApiRequestError(message, response.status);
  }

  return (await response.json()) as PaginatedResponse<MemoryExplorerRecord>;
}

function getOriginalImportance(memory: MemoryExplorerRecord): number {
  return memory.original_importance_score ?? memory.importance_score;
}

function ImportanceScore({ memory }: { memory: MemoryExplorerRecord }) {
  const original = getOriginalImportance(memory);
  const current = memory.importance_score;
  const delta = current - original;
  const increased = delta > 0;
  const decreased = delta < 0;
  const trend =
    delta > 0.3 ? "rising" : delta < -0.3 ? "decaying" : "stable";
  const trendClassName =
    trend === "rising"
      ? "text-emerald-700"
      : trend === "decaying"
        ? "text-rose-700"
        : "text-slate-500";
  const trendLabel =
    trend === "rising"
      ? "↑ rising"
      : trend === "decaying"
        ? "↓ decaying"
        : "→ stable";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 font-semibold text-slate-950">
        <span>{current.toFixed(1)}</span>
        {increased ? (
          <span
            title={`Score increased from original ${original.toFixed(1)} due to frequent retrieval`}
          >
            <TrendingUp className="size-4 text-emerald-600" />
          </span>
        ) : null}
        {decreased ? (
          <span
            title={`Score decreased from original ${original.toFixed(1)} due to inactivity`}
          >
            <TrendingDown className="size-4 text-rose-600" />
          </span>
        ) : null}
      </div>
      <div className="text-xs text-slate-500">orig: {original.toFixed(1)}</div>
      <div className={`text-xs font-medium ${trendClassName}`}>
        {trendLabel}
      </div>
    </div>
  );
}

function MemoryStatusBadges({ memory }: { memory: MemoryExplorerRecord }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge
        variant="outline"
        className={
          memory.is_archived
            ? "border-slate-200 bg-slate-100 text-slate-700"
            : "border-emerald-200 bg-emerald-100 text-emerald-800"
        }
      >
        {memory.is_archived ? "Archived" : "Active"}
      </Badge>
      {memory.is_hot ? (
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-100 text-amber-800"
          title="Frequently accessed - served from fast cache"
        >
          <Flame className="mr-1 size-3" />
          HOT
        </Badge>
      ) : null}
      {memory.system_archived ? (
        <Badge
          variant="outline"
          className="border-slate-200 bg-slate-100 text-slate-700"
          title="Auto-archived by lifecycle manager due to low importance and inactivity"
        >
          AUTO
        </Badge>
      ) : null}
    </div>
  );
}

export default function MemoriesPage() {
  const { isLoaded, getToken } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRangeValue>("all");
  const [historyMemoryId, setHistoryMemoryId] = useState<string | null>(null);
  const memories = useSWR(
    isLoaded ? ["memories-list", timeRange] : null,
    () => fetchMemories(getToken, { limit: 50, timeRange }),
    { refreshInterval: 30_000 },
  );

  const metrics = useMemo(() => {
    const rows = memories.data?.data ?? [];
    const archived = rows.filter((item) => item.is_archived).length;
    const avgImportance =
      rows.length > 0
        ? rows.reduce((sum, item) => sum + item.importance_score, 0) / rows.length
        : 0;
    const categoryCounts = rows.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1;
      return acc;
    }, {});
    const topCategory =
      Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "No data";

    return {
      total: rows.length,
      archived,
      avgImportance,
      topCategory,
    };
  }, [memories.data]);

  return (
    <div className="flex flex-col gap-6 pt-14 md:pt-0">
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
          Memories
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Workspace memory stream
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          Review the latest memory records available to this authenticated dashboard
          workspace, including category, confidence, and access patterns.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Visible Memories"
          value={metrics.total.toLocaleString("en-IN")}
          description="Latest records returned from the memories API"
          icon={Brain}
          loading={memories.isLoading && !memories.data}
          error={(memories.error as ApiRequestError | undefined)?.message}
          onRetry={() => void memories.mutate()}
        />
        <MetricCard
          title="Archived"
          value={metrics.archived.toLocaleString("en-IN")}
          description="Records marked as archived in the current view"
          icon={Archive}
          loading={memories.isLoading && !memories.data}
          error={(memories.error as ApiRequestError | undefined)?.message}
          onRetry={() => void memories.mutate()}
        />
        <MetricCard
          title="Avg Importance"
          value={metrics.avgImportance.toFixed(1)}
          description="Mean importance score across loaded memories"
          icon={Star}
          loading={memories.isLoading && !memories.data}
          error={(memories.error as ApiRequestError | undefined)?.message}
          onRetry={() => void memories.mutate()}
        />
        <MetricCard
          title="Top Category"
          value={metrics.topCategory}
          description="Most common memory category in the current page"
          icon={FolderOpen}
          loading={memories.isLoading && !memories.data}
          error={(memories.error as ApiRequestError | undefined)?.message}
          onRetry={() => void memories.mutate()}
        />
      </section>

      {metrics.total === 0 && !memories.isLoading && !memories.error ? (
        <SdkQuickstart emptyState />
      ) : null}

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Latest memory records</CardTitle>
            <CardDescription>
              Showing the most recent 50 records available through the backend list
              endpoint.
            </CardDescription>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Time range
            </label>
            <Select
              value={timeRange}
              onValueChange={(value) => setTimeRange(value as TimeRangeValue)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-slate-700">
            Not seeing expected memories?{" "}
            <Link
              href="/quality-log?status=nothing_to_extract"
              className="font-semibold text-sky-700 hover:text-sky-900"
            >
              Check if conversations had nothing to extract -&gt;
            </Link>
          </div>
          {memories.isLoading && !memories.data ? (
            <div className="space-y-3">
              <div className="h-10 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-200" />
            </div>
          ) : memories.error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="text-sm font-medium text-rose-800">
                {(memories.error as ApiRequestError).message}
              </div>
              <Button className="mt-3" variant="outline" onClick={() => void memories.mutate()}>
                Retry
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Importance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Access Count</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">History</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memories.data?.data.length ? (
                  memories.data.data.map((memory) => (
                    <TableRow key={memory.id}>
                      <TableCell className="max-w-xl whitespace-normal text-slate-700">
                        {truncateContent(memory.content)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                          {memory.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ImportanceScore memory={memory} />
                      </TableCell>
                      <TableCell>
                        <MemoryStatusBadges memory={memory} />
                      </TableCell>
                      <TableCell>{memory.confidence_score.toFixed(2)}</TableCell>
                      <TableCell>{memory.access_count}</TableCell>
                      <TableCell className="text-slate-600">
                        {formatDateTime(memory.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryMemoryId(memory.id)}
                        >
                          <History className="mr-2 size-4" />
                          History
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-slate-500">
                      No memories yet. Follow the quick start above.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MemoryHistorySlideover
        memoryId={historyMemoryId}
        open={Boolean(historyMemoryId)}
        onClose={() => setHistoryMemoryId(null)}
        getToken={getToken}
      />
    </div>
  );
}
