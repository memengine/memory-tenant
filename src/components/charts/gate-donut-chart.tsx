"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GateBreakdownSlice } from "@/lib/api";

const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
] as const;

const SLICE_BADGES = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
] as const;

export function GateDonutChart({
  data,
  loading = false,
  error,
  onRetry,
}: {
  data: GateBreakdownSlice[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gate Block Breakdown</CardTitle>
        <CardDescription>
          Which quality gate layers are stopping calls most often.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            No blocked calls yet.
          </div>
        ) : (
          <>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={56}
                    outerRadius={88}
                    paddingAngle={3}
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 16,
                      borderColor: "var(--border)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-2">
              {data.map((slice, index) => (
                <div
                  key={slice.name}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <span
                      className={`size-2.5 rounded-full ${SLICE_BADGES[index % SLICE_BADGES.length]}`}
                    />
                    <span>{slice.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-950">
                    {slice.value}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
