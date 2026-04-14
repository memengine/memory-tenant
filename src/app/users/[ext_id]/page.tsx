"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import { AlertTriangle, Database, ShieldBan, Trash2 } from "lucide-react";

import { MemoryList } from "@/components/memory-list";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ApiRequestError,
  deleteMemory,
  deleteTenantUser,
  getTenantUserDetail,
  listMemories,
  truncateUserId,
  type MemoryRecord,
} from "@/lib/api";

type MemoryPayload = {
  memories: MemoryRecord[];
  nextCursor: string | null;
};

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

export default function UserDetailPage() {
  const params = useParams<{ ext_id: string }>();
  const router = useRouter();
  const { isLoaded, getToken } = useAuth();
  const externalUserId = decodeURIComponent(params.ext_id);
  const [memoryPageCount, setMemoryPageCount] = useState(1);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    setMemoryPageCount(1);
  }, [externalUserId]);

  const user = useSWR(
    isLoaded ? ["tenant-user-detail-page", externalUserId] : null,
    ([, extId]: [string, string]) => getTenantUserDetail(getToken, extId),
  );

  const memories = useSWR<MemoryPayload>(
    isLoaded ? ["tenant-user-memories", externalUserId, memoryPageCount] : null,
    async ([, extId, pages]: [string, string, number]) => {
      let cursor: string | null = null;
      const merged: MemoryRecord[] = [];

      for (let index = 0; index < pages; index += 1) {
        const response = await listMemories(getToken, {
          limit: 20,
          cursor,
          externalUserId: extId,
        });
        merged.push(...response.data);
        cursor = response.pagination.next_cursor;
        if (!cursor) {
          break;
        }
      }

      return {
        memories: merged,
        nextCursor: cursor,
      };
    },
    { keepPreviousData: true },
  );

  const stats = useMemo(() => {
    const detail = user.data;
    return {
      memoryCount: detail?.memory_count ?? 0,
      avgQualityScore: detail?.quality_score_avg ?? null,
      blockHistoryCount: detail?.block_history.length ?? 0,
    };
  }, [user.data]);

  async function handleDeleteMemory(memoryId: string) {
    await deleteMemory(getToken, memoryId);
    await memories.mutate();
  }

  async function handleDeleteAll() {
    if (deleteConfirmation !== "DELETE") {
      return;
    }
    setDeletingAll(true);
    try {
      await deleteTenantUser(getToken, externalUserId);
      router.push("/users");
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pt-14 md:pt-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
            Users
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            {truncateUserId(externalUserId)}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span>Created {formatDateTime(user.data?.created_at ?? null)}</span>
            <span>Last active {formatDateTime(user.data?.last_active_at ?? null)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Badge
            variant="outline"
            className={
              user.data?.block_history.length
                ? "border-amber-200 bg-amber-100 text-amber-800"
                : "border-emerald-200 bg-emerald-100 text-emerald-800"
            }
          >
            {user.data?.block_history.length ? "Review recommended" : "Healthy"}
          </Badge>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 size-4" />
            GDPR Delete All
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Memory Count"
          value={stats.memoryCount.toLocaleString("en-IN")}
          description="Memories currently tied to this user"
          icon={Database}
          loading={user.isLoading && !user.data}
          error={(user.error as ApiRequestError | undefined)?.message}
          onRetry={() => void user.mutate()}
        />
        <MetricCard
          title="Avg Quality Score"
          value={stats.avgQualityScore !== null ? stats.avgQualityScore.toFixed(2) : "No score"}
          description="Rolling 7-day quality signal"
          icon={ShieldBan}
          loading={user.isLoading && !user.data}
          error={(user.error as ApiRequestError | undefined)?.message}
          onRetry={() => void user.mutate()}
        />
        <MetricCard
          title="Block History"
          value={stats.blockHistoryCount.toLocaleString("en-IN")}
          description="Recent blocked calls recorded for this user"
          icon={AlertTriangle}
          loading={user.isLoading && !user.data}
          error={(user.error as ApiRequestError | undefined)?.message}
          onRetry={() => void user.mutate()}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Memory list</CardTitle>
            <CardDescription>
              Latest memories for this user, with one-click deletion when needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MemoryList
              memories={memories.data?.memories ?? []}
              loading={memories.isLoading && !memories.data}
              loadingMore={memories.isValidating && Boolean(memories.data)}
              error={(memories.error as ApiRequestError | undefined)?.message ?? null}
              hasMore={Boolean(memories.data?.nextCursor)}
              onRetry={() => void memories.mutate()}
              onLoadMore={() => setMemoryPageCount((count) => count + 1)}
              onDeleteMemory={handleDeleteMemory}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Block history</CardTitle>
            <CardDescription>
              Last 50 block events captured for this user.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.isLoading && !user.data ? (
              <>
                <div className="h-16 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-16 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-16 animate-pulse rounded-xl bg-slate-200" />
              </>
            ) : user.error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="text-sm font-medium text-rose-800">
                  {(user.error as ApiRequestError).message}
                </div>
                <Button className="mt-3" variant="outline" onClick={() => void user.mutate()}>
                  Retry
                </Button>
              </div>
            ) : user.data?.block_history.length ? (
              user.data.block_history.map((event, index) => (
                <div key={`${event.blocked_at}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline" className="border-amber-200 bg-amber-100 text-amber-800">
                      {event.layer}
                    </Badge>
                    <span className="text-xs text-slate-500">{formatDateTime(event.blocked_at)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {(event.reason ?? "").trim() || "No reason captured"}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                No block events recorded for this user yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <div>
        <Button variant="outline" asChild>
          <Link href="/users">Back to users</Link>
        </Button>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>GDPR delete all memories</DialogTitle>
            <DialogDescription>
              Type DELETE to remove this user and all associated memories permanently.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder='Type "DELETE" to confirm'
          />
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              disabled={deleteConfirmation !== "DELETE" || deletingAll}
              onClick={() => void handleDeleteAll()}
            >
              {deletingAll ? "Deleting..." : "Delete all"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
