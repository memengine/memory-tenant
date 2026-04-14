"use client";

import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import { Archive, Brain, FolderOpen, Star } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
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
import { ApiRequestError, listMemories } from "@/lib/api";

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

export default function MemoriesPage() {
  const { isLoaded, getToken } = useAuth();
  const memories = useSWR(
    isLoaded ? "memories-list" : null,
    () => listMemories(getToken, { limit: 50 }),
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

      <Card>
        <CardHeader>
          <CardTitle>Latest memory records</CardTitle>
          <CardDescription>
            Showing the most recent 50 records available through the backend list
            endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  <TableHead>Confidence</TableHead>
                  <TableHead>Access Count</TableHead>
                  <TableHead>Created</TableHead>
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
                      <TableCell>{memory.importance_score.toFixed(1)}</TableCell>
                      <TableCell>{memory.confidence_score.toFixed(2)}</TableCell>
                      <TableCell>{memory.access_count}</TableCell>
                      <TableCell className="text-slate-600">
                        {formatDateTime(memory.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                      No memories found for this workspace yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
