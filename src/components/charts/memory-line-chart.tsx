"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MemoryAdditionPoint } from "@/lib/api";

export function MemoryLineChart({
  data,
  loading = false,
  error,
  onRetry,
}: {
  data: MemoryAdditionPoint[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Memory Additions</CardTitle>
        <CardDescription>Daily memory creation over the last 30 days.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[320px] animate-pulse rounded-2xl bg-slate-200" />
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="text-sm font-medium text-rose-800">{error}</div>
            {onRetry ? (
              <Button className="mt-3" variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
            No memory additions yet.
          </div>
        ) : (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  className="fill-slate-500 text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  className="fill-slate-500 text-xs"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    borderColor: "var(--border)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--chart-2)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
