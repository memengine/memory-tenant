"use client";

import Link from "next/link";

import type { QualityLogEntry } from "@/lib/api";
import { truncateUserId } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LayerFilter = "ALL" | "L1" | "L2" | "L3" | "L4";
type DateRangeFilter = "24h" | "7d" | "30d";

type QualityLogTableProps = {
  rows: QualityLogEntry[];
  loading: boolean;
  error?: string | null;
  layerFilter: LayerFilter;
  onLayerFilterChange: (value: LayerFilter) => void;
  dateRange: DateRangeFilter;
  onDateRangeChange: (value: DateRangeFilter) => void;
  onRetry: () => void;
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function qualityBadgeClass(score: number): string {
  if (score > 0.7) {
    return "border-emerald-200 bg-emerald-100 text-emerald-800";
  }
  if (score >= 0.35) {
    return "border-amber-200 bg-amber-100 text-amber-800";
  }
  return "border-rose-200 bg-rose-100 text-rose-800";
}

export function QualityLogTable({
  rows,
  loading,
  error,
  layerFilter,
  onLayerFilterChange,
  dateRange,
  onDateRangeChange,
  onRetry,
}: QualityLogTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={layerFilter} onValueChange={(value) => onLayerFilterChange(value as LayerFilter)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Layer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All layers</SelectItem>
            <SelectItem value="L1">L1</SelectItem>
            <SelectItem value="L2">L2</SelectItem>
            <SelectItem value="L3">L3</SelectItem>
            <SelectItem value="L4">L4</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={(value) => onDateRangeChange(value as DateRangeFilter)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24h</SelectItem>
            <SelectItem value="7d">7d</SelectItem>
            <SelectItem value="30d">30d</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-11 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-11 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-11 animate-pulse rounded-xl bg-slate-200" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-medium text-rose-800">{error}</div>
          <Button className="mt-3" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Blocked At</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Quality Score</TableHead>
                <TableHead>Similarity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-slate-600">{formatDateTime(entry.created_at)}</TableCell>
                    <TableCell className="font-medium text-slate-900">
                      <Link
                        href={`/users/${encodeURIComponent(entry.external_user_id)}`}
                        className="hover:text-sky-700"
                      >
                        {truncateUserId(entry.external_user_id)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          entry.layer_blocked_at === "NONE"
                            ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                            : "border-amber-200 bg-amber-100 text-amber-800"
                        }
                      >
                        {entry.layer_blocked_at}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-slate-600">
                      {(entry.reason ?? "").trim() || "No reason captured"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(qualityBadgeClass(entry.quality_score))}>
                        {entry.quality_score.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {entry.layer_blocked_at === "L3" && entry.semantic_similarity !== null
                        ? entry.semantic_similarity.toFixed(2)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                    No quality log entries match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
