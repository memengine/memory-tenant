"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Search, ShieldBan } from "lucide-react";

import type { TenantUser } from "@/lib/api";
import { truncateUserId } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type UserSort = "last_active" | "memory_count" | "quality_score";

type UserTableProps = {
  users: TenantUser[];
  loading: boolean;
  loadingMore: boolean;
  error?: string | null;
  onRetry: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  sortValue: UserSort;
  onSortChange: (value: UserSort) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  onExportCsv: () => void;
  onConfirmBlock: (externalUserId: string) => Promise<void>;
};

function formatRelativeTime(value: string | null): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, unitSeconds] of ranges) {
    if (Math.abs(seconds) >= unitSeconds || unit === "minute") {
      return formatter.format(Math.round(seconds / unitSeconds), unit);
    }
  }

  return "just now";
}

function qualityBadgeClass(score: number | null): string {
  if (score === null) {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }
  if (score > 0.7) {
    return "border-emerald-200 bg-emerald-100 text-emerald-800";
  }
  if (score >= 0.35) {
    return "border-amber-200 bg-amber-100 text-amber-800";
  }
  return "border-rose-200 bg-rose-100 text-rose-800";
}

export function UserTable({
  users,
  loading,
  loadingMore,
  error,
  onRetry,
  searchValue,
  onSearchChange,
  sortValue,
  onSortChange,
  hasMore,
  onLoadMore,
  onExportCsv,
  onConfirmBlock,
}: UserTableProps) {
  const [blockTarget, setBlockTarget] = useState<TenantUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyState = useMemo(() => {
    if (searchValue.trim()) {
      return "No users match that search yet.";
    }
    return "No tenant users found yet.";
  }, [searchValue]);

  async function handleBlockConfirm() {
    if (!blockTarget) {
      return;
    }
    setSubmitting(true);
    try {
      await onConfirmBlock(blockTarget.external_user_id);
      setBlockTarget(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search user id"
              className="pl-9"
            />
          </div>
          <Select value={sortValue} onValueChange={(value) => onSortChange(value as UserSort)}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Sort users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_active">Last Active</SelectItem>
              <SelectItem value="memory_count">Memory Count</SelectItem>
              <SelectItem value="quality_score">Quality Score</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={onExportCsv}>
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
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
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Memories</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Quality Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.external_user_id}>
                      <TableCell className="font-medium text-slate-900">
                        <Link
                          href={`/users/${encodeURIComponent(user.external_user_id)}`}
                          className="hover:text-sky-700"
                        >
                          {truncateUserId(user.external_user_id)}
                        </Link>
                      </TableCell>
                      <TableCell>{user.memory_count.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-slate-600">
                        {formatRelativeTime(user.last_active_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(qualityBadgeClass(user.quality_score_avg))}>
                          {user.quality_score_avg !== null ? user.quality_score_avg.toFixed(2) : "No score"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.is_blocked
                              ? "border-rose-200 bg-rose-100 text-rose-800"
                              : "border-emerald-200 bg-emerald-100 text-emerald-800"
                          }
                        >
                          {user.is_blocked ? "Blocked" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/users/${encodeURIComponent(user.external_user_id)}`}>View</Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBlockTarget(user)}
                            disabled={user.is_blocked}
                          >
                            <ShieldBan className="mr-2 size-4" />
                            Block User
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                      {emptyState}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {hasMore ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={onLoadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <Dialog open={Boolean(blockTarget)} onOpenChange={(open) => !open && setBlockTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block user</DialogTitle>
            <DialogDescription>
              {blockTarget
                ? `Block ${truncateUserId(blockTarget.external_user_id)}? They will not be able to generate new memories.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button variant="destructive" onClick={() => void handleBlockConfirm()} disabled={submitting}>
              {submitting ? "Blocking..." : "Confirm block"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
