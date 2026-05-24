"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import {
  AlertTriangle,
  CheckCircle,
  GitMerge,
  Loader2,
  MessageCircle,
  UserCheck,
  Zap,
} from "lucide-react";

import { ConflictBreakdownChart } from "@/components/conflict-breakdown-chart";
import { ConflictTenantReviewCard } from "@/components/conflict-tenant-review-card";
import { ConflictUserSessionCard } from "@/components/conflict-user-session-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ApiRequestError,
  type SharedContextConflict,
  getSharedContextConflicts,
  resolveTenantConflict,
} from "@/lib/api";
import { useConflictStats } from "@/hooks/useConflictStats";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatRelativeTime(value?: string | null): string {
  if (!value) {
    return "unknown time";
  }
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) {
    return "unknown time";
  }
  const days = Math.floor(Math.max(0, Date.now() - date) / (24 * 60 * 60 * 1000));
  if (days < 1) {
    return "today";
  }
  return `${days}d ago`;
}

function truncateSummary(value?: string | null): string {
  if (!value) {
    return "Memory content unavailable.";
  }
  return value.length > 140 ? `${value.slice(0, 137)}...` : value;
}

function conflictDedupeKey(conflict: SharedContextConflict): string {
  const memoryIds = [conflict.user_a_memory_id, conflict.user_b_memory_id]
    .filter(Boolean)
    .sort()
    .join(":");
  const fallback = [conflict.entity_value_a, conflict.entity_value_b]
    .map((value) => value.toLowerCase().trim())
    .sort()
    .join(":");
  return [
    conflict.entity_type,
    memoryIds || fallback,
    conflict.status,
    conflict.resolution_path ?? "",
  ].join("|");
}

function dedupeConflicts(conflicts: SharedContextConflict[]): SharedContextConflict[] {
  const seen = new Set<string>();
  return conflicts.filter((conflict) => {
    const key = conflictDedupeKey(conflict);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  subtext: string;
  icon: typeof GitMerge;
  tone: string;
}) {
  return (
    <Card className={`border ${tone}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {title}
            </p>
            <p className="mt-4 text-3xl font-semibold text-slate-950">{value}</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-3 text-slate-700 shadow-sm">
            <Icon className="size-5" />
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{subtext}</p>
      </CardContent>
    </Card>
  );
}

function ResolvedConflictCard({ conflict }: { conflict: SharedContextConflict }) {
  const isBothValid = conflict.resolution === "both_valid" || conflict.status === "ignored";
  const badge =
    conflict.resolved_by === "user_session"
      ? "User confirmed in session"
      : isBothValid
        ? "Both valid"
        : "You resolved";

  const summary =
    conflict.resolution === "A"
      ? conflict.memory_a_content
      : conflict.resolution === "B"
        ? conflict.memory_b_content
        : "Both memories were kept as valid in different contexts.";

  return (
    <Card className="border-slate-200 bg-slate-50">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge
            className={
              conflict.resolved_by === "user_session"
                ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                : isBothValid
                  ? "border-slate-200 bg-white text-slate-700"
                  : "border-sky-200 bg-sky-100 text-sky-800"
            }
          >
            {badge}
          </Badge>
          <span className="text-sm text-slate-500">
            Resolved {formatRelativeTime(conflict.resolved_at ?? conflict.auto_resolution_at)}
          </span>
        </div>
        <p className="text-sm leading-6 text-slate-700">
          {truncateSummary(summary)}
        </p>
      </CardContent>
    </Card>
  );
}

export default function ConflictsPage() {
  const { isLoaded, getToken } = useAuth();
  const [busyConflictId, setBusyConflictId] = useState<string | null>(null);
  const [resolvedTab, setResolvedTab] = useState<"user" | "tenant" | "both">("user");
  const stats = useConflictStats();
  const conflicts = useSWR(
    isLoaded ? "tenant-shared-context-conflicts" : null,
    () => getSharedContextConflicts(getToken),
    { refreshInterval: 60_000 },
  );
  const uniqueConflicts = useMemo(
    () => dedupeConflicts(conflicts.data ?? []),
    [conflicts.data],
  );

  const userSessionConflicts = useMemo(
    () =>
      uniqueConflicts.filter(
        (row) =>
          row.resolution_path === "user_session" &&
          row.status === "clarification_queued",
      ),
    [uniqueConflicts],
  );

  const tenantReviewConflicts = useMemo(
    () =>
      uniqueConflicts.filter(
        (row) =>
          row.resolution_path === "tenant_review" &&
          row.status === "pending" &&
          row.requires_attention,
      ),
    [uniqueConflicts],
  );

  const resolvedConflicts = useMemo(
    () =>
      uniqueConflicts.filter(
        (row) => row.status === "resolved" || row.status === "ignored",
      ),
    [uniqueConflicts],
  );

  async function handleResolve(
    conflict: SharedContextConflict,
    correctUser: "A" | "B" | "both_valid",
  ) {
    setBusyConflictId(conflict.id);
    try {
      await resolveTenantConflict(getToken, conflict.id, {
        correct_user: correctUser,
      });
      await Promise.all([stats.mutate(), conflicts.mutate()]);
    } finally {
      setBusyConflictId(null);
    }
  }

  const loading = (stats.isLoading && !stats.data) || (conflicts.isLoading && !conflicts.data);
  const error =
    (stats.error as ApiRequestError | undefined) ??
    (conflicts.error as ApiRequestError | undefined);

  const resolvedForTab = resolvedConflicts.filter((conflict) => {
    if (resolvedTab === "user") {
      return conflict.resolved_by === "user_session";
    }
    if (resolvedTab === "tenant") {
      return conflict.resolved_by === "tenant" && conflict.resolution !== "both_valid";
    }
    return conflict.resolution === "both_valid" || conflict.status === "ignored";
  });

  return (
    <div className="flex flex-col gap-6 pt-14 md:pt-0">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
          Conflict Intelligence
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Shared Context Conflicts
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          MemoryOS resolves most conflicts automatically. The few remaining
          conflicts are routed either to the user&apos;s next session or to a
          simple tenant review.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-sm text-slate-600">
            <Loader2 className="size-4 animate-spin" />
            Loading conflict intelligence...
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="py-6 text-sm text-rose-900">
            {error.message}
          </CardContent>
        </Card>
      ) : stats.data ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Conflicts Detected"
              value={stats.data.total_detected_mtd.toLocaleString("en-IN")}
              subtext="this month"
              icon={GitMerge}
              tone="border-slate-200 bg-slate-50"
            />
            <StatCard
              title="Auto-Resolved"
              value={stats.data.auto_resolved_mtd.toLocaleString("en-IN")}
              subtext={`${formatPercent(stats.data.auto_resolution_rate)} resolved automatically`}
              icon={Zap}
              tone="border-emerald-200 bg-emerald-50"
            />
            <StatCard
              title="User Sessions"
              value={stats.data.pending_user_session.toLocaleString("en-IN")}
              subtext="being clarified with users"
              icon={MessageCircle}
              tone="border-sky-200 bg-sky-50"
            />
            <StatCard
              title="Needs Your Input"
              value={stats.data.pending_tenant_review.toLocaleString("en-IN")}
              subtext="shared facts awaiting tenant review"
              icon={stats.data.pending_tenant_review > 0 ? AlertTriangle : CheckCircle}
              tone={
                stats.data.pending_tenant_review > 0
                  ? "border-amber-200 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50"
              }
            />
          </section>

          <ConflictBreakdownChart breakdown={stats.data.resolution_breakdown} />

          {stats.data.pending_user_session > 0 ? (
            <section className="space-y-4">
              <div>
                <div className="flex items-center gap-3">
                  <MessageCircle className="size-5 text-sky-700" />
                  <h2 className="text-xl font-semibold text-slate-950">
                    Resolving through conversation
                  </h2>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  These conflicts involve personal information only the user
                  knows. MemoryOS will ask them naturally in their next session.
                </p>
              </div>
              {userSessionConflicts.map((conflict) => (
                <ConflictUserSessionCard key={conflict.id} conflict={conflict} />
              ))}
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
                No action needed. MemoryOS handles these automatically. You will
                see them move to Resolved once the user responds.
              </div>
            </section>
          ) : null}

          {stats.data.pending_tenant_review > 0 ? (
            <section id="tenant-review" className="space-y-4">
              <div>
                <div className="flex items-center gap-3">
                  <UserCheck className="size-5 text-amber-700" />
                  <h2 className="text-xl font-semibold text-slate-950">
                    These need your input
                  </h2>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  These conflicts involve shared team or organisation
                  information. You know which version is correct.
                </p>
              </div>
              {tenantReviewConflicts.map((conflict) => (
                <ConflictTenantReviewCard
                  key={conflict.id}
                  conflict={conflict}
                  busy={busyConflictId === conflict.id}
                  onResolve={(correctUser) => void handleResolve(conflict, correctUser)}
                />
              ))}
            </section>
          ) : null}

          {resolvedConflicts.length > 0 ? (
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Resolved
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Completed conflict decisions grouped by resolution path.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={resolvedTab === "user" ? "default" : "outline"}
                  onClick={() => setResolvedTab("user")}
                >
                  Resolved by User
                </Button>
                <Button
                  type="button"
                  variant={resolvedTab === "tenant" ? "default" : "outline"}
                  onClick={() => setResolvedTab("tenant")}
                >
                  Resolved by You
                </Button>
                <Button
                  type="button"
                  variant={resolvedTab === "both" ? "default" : "outline"}
                  onClick={() => setResolvedTab("both")}
                >
                  Both Valid
                </Button>
              </div>
              {resolvedForTab.length > 0 ? (
                <div className="space-y-3">
                  {resolvedForTab.map((conflict) => (
                    <ResolvedConflictCard key={conflict.id} conflict={conflict} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-slate-500">
                    No conflicts in this resolved group yet.
                  </CardContent>
                </Card>
              )}
            </section>
          ) : stats.data.pending_user_session === 0 &&
            stats.data.pending_tenant_review === 0 ? (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="flex gap-4 py-7 text-emerald-950">
                <CheckCircle className="mt-0.5 size-5 shrink-0" />
                <div>
                  <div className="font-semibold">No conflicts need attention</div>
                  <p className="mt-1 text-sm text-emerald-900/80">
                    Auto-resolution and user-session clarification are keeping
                    shared context clean without tenant intervention.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
