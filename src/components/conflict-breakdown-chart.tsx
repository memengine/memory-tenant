"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ConflictStats } from "@/lib/api";

const RESOLUTION_TYPES = [
  {
    key: "per_user_scoped",
    label: "Per-user scoped",
    description: "not real conflicts",
    color: "#94a3b8",
  },
  {
    key: "recency_weighted",
    label: "Recency weighted",
    description: "newer claim wins",
    color: "#34d399",
  },
  {
    key: "confidence_weighted",
    label: "Confidence weighted",
    description: "clearer claim wins",
    color: "#60a5fa",
  },
  {
    key: "clarification_queued",
    label: "Clarification queued",
    description: "user will confirm",
    color: "#fbbf24",
  },
] as const;

export function ConflictBreakdownChart({
  breakdown,
}: {
  breakdown: ConflictStats["resolution_breakdown"];
}) {
  const rows = RESOLUTION_TYPES.map((item) => ({
    ...item,
    count: breakdown[item.key] ?? 0,
  }));
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950">
          How conflicts were resolved automatically
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          No action needed. MemoryOS weights newer or clearer claims and asks
          users for clarification when the system cannot safely infer the answer.
        </p>
      </div>

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
          No shared context conflicts have been auto-resolved this month yet.
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 8, right: 24, bottom: 8, left: 36 }}
            >
              <CartesianGrid stroke="#e2e8f0" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={142}
                tick={{ fill: "#334155", fontSize: 12 }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) {
                    return null;
                  }
                  const row = payload[0].payload as {
                    label: string;
                    count: number;
                    description: string;
                  };
                  return (
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xl">
                      <div className="font-medium text-slate-950">{row.label}</div>
                      <div className="mt-1 text-slate-600">
                        {row.count.toLocaleString("en-IN")} conflicts -{" "}
                        {row.description}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {rows.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
