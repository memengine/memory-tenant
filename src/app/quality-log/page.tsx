"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { AlertTriangle, Gauge, Layers3, ShieldAlert, X } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { QualityLogTable } from "@/components/quality-log-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ApiRequestError,
  getAllTenantQualityLogEntries,
  type QualityLogEntry,
} from "@/lib/api";

type LayerFilter = "ALL" | "L1" | "L2" | "L3" | "L4" | "NOTHING_TO_EXTRACT";
type DateRangeFilter = "24h" | "7d" | "30d";

function isNothingToExtract(row: QualityLogEntry): boolean {
  return (
    row.nothing_to_extract === true ||
    (row.layer_blocked_at === "NONE" &&
      /nothing[\s_-]*to[\s_-]*extract/i.test(row.reason ?? ""))
  );
}

function applyDateRange(rows: QualityLogEntry[], range: DateRangeFilter): QualityLogEntry[] {
  const now = Date.now();
  const windowMs =
    range === "24h" ? 24 * 60 * 60 * 1000 : range === "7d" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

  return rows.filter((row) => {
    const createdAt = new Date(row.created_at).getTime();
    return !Number.isNaN(createdAt) && now - createdAt <= windowMs;
  });
}

export default function QualityLogPage() {
  const { isLoaded, getToken } = useAuth();
  const searchParams = useSearchParams();
  const [layerFilter, setLayerFilter] = useState<LayerFilter>(() =>
    searchParams.get("status") === "nothing_to_extract"
      ? "NOTHING_TO_EXTRACT"
      : "ALL",
  );
  const [dateRange, setDateRange] = useState<DateRangeFilter>("7d");
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const qualityLog = useSWR(
    isLoaded ? "tenant-quality-log-screen" : null,
    () => getAllTenantQualityLogEntries(getToken),
    { refreshInterval: 60_000 },
  );

  const filteredRows = useMemo(() => {
    const rows = applyDateRange(qualityLog.data ?? [], dateRange);
    if (layerFilter === "ALL") {
      return rows;
    }
    if (layerFilter === "NOTHING_TO_EXTRACT") {
      return rows.filter(isNothingToExtract);
    }
    return rows.filter((row) => row.layer_blocked_at === layerFilter);
  }, [dateRange, layerFilter, qualityLog.data]);

  const summary = useMemo(() => {
    const rows = qualityLog.data ?? [];
    const today = new Date();
    const todayRows = rows.filter((row) => {
      const date = new Date(row.created_at);
      return (
        date.getUTCFullYear() === today.getUTCFullYear() &&
        date.getUTCMonth() === today.getUTCMonth() &&
        date.getUTCDate() === today.getUTCDate()
      );
    });
    const nothingRows = todayRows.filter(isNothingToExtract);
    const blockedRows = todayRows.filter((row) => row.layer_blocked_at !== "NONE");
    const storedRows = todayRows.filter(
      (row) => row.layer_blocked_at === "NONE" && !isNothingToExtract(row),
    );
    const byLayer = {
      L1: blockedRows.filter((row) => row.layer_blocked_at === "L1").length,
      L2: blockedRows.filter((row) => row.layer_blocked_at === "L2").length,
      L3: blockedRows.filter((row) => row.layer_blocked_at === "L3").length,
      L4: blockedRows.filter((row) => row.layer_blocked_at === "L4").length,
    };

    const visibleBlocked = filteredRows.filter((row) => row.layer_blocked_at !== "NONE");
    const l2BlockRate = filteredRows.length
      ? visibleBlocked.filter((row) => row.layer_blocked_at === "L2").length / filteredRows.length
      : 0;

    const avgQuality =
      filteredRows.length > 0
        ? filteredRows.reduce((sum, row) => sum + row.quality_score, 0) / filteredRows.length
        : 0;

    return {
      todayTotal: todayRows.length,
      todayBlocked: blockedRows.length,
      todayNothingToExtract: nothingRows.length,
      todayStored: storedRows.length,
      todayRate: todayRows.length ? blockedRows.length / todayRows.length : 0,
      byLayer,
      l2BlockRate,
      avgQuality,
      topLayer:
        layerFilter === "NOTHING_TO_EXTRACT"
          ? "NONE"
          : ["L1", "L2", "L3", "L4"].sort(
              (left, right) =>
                filteredRows.filter((row) => row.layer_blocked_at === right).length -
                filteredRows.filter((row) => row.layer_blocked_at === left).length,
            )[0] ?? "L1",
    };
  }, [filteredRows, layerFilter, qualityLog.data]);

  const errorMessage = (qualityLog.error as ApiRequestError | undefined)?.message;

  return (
    <div className="flex flex-col gap-6 pt-14 md:pt-0">
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
          Quality Log
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Quality gate visibility
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          Understand what the quality gate is blocking, why it is blocking, and where intervention is needed.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Today Blocked"
          value={summary.todayBlocked.toLocaleString("en-IN")}
          description="Calls blocked so far today"
          icon={ShieldAlert}
          loading={qualityLog.isLoading && !qualityLog.data}
          error={errorMessage}
          onRetry={() => void qualityLog.mutate()}
        />
        <MetricCard
          title="Today Block Rate"
          value={`${(summary.todayRate * 100).toFixed(1)}%`}
          description="Blocked calls divided by total calls today"
          icon={AlertTriangle}
          loading={qualityLog.isLoading && !qualityLog.data}
          error={errorMessage}
          onRetry={() => void qualityLog.mutate()}
        />
        <MetricCard
          title="Avg Quality"
          value={summary.avgQuality.toFixed(2)}
          description="Average quality score in the current filter"
          icon={Gauge}
          loading={qualityLog.isLoading && !qualityLog.data}
          error={errorMessage}
          onRetry={() => void qualityLog.mutate()}
        />
        <MetricCard
          title="Top Block Layer"
          value={summary.topLayer}
          description="Most frequent block layer in the current filter"
          icon={Layers3}
          loading={qualityLog.isLoading && !qualityLog.data}
          error={errorMessage}
          onRetry={() => void qualityLog.mutate()}
        />
      </section>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Today: {summary.todayBlocked} blocked, {summary.todayNothingToExtract} nothing-to-extract, {summary.todayStored} stored - out of {summary.todayTotal} total
          </div>

          {!bannerDismissed && summary.l2BlockRate > 0.3 ? (
            <div className="mt-4 flex items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div>
                L2 is blocking more than 30% of the currently filtered calls. Review recent duplicate or similarity-heavy traffic before this turns into customer-visible degradation.
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setBannerDismissed(true)}>
                <X className="size-4" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <QualityLogTable
            rows={filteredRows}
            loading={qualityLog.isLoading && !qualityLog.data}
            error={errorMessage}
            layerFilter={layerFilter}
            onLayerFilterChange={setLayerFilter}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onRetry={() => void qualityLog.mutate()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
