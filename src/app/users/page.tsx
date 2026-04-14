"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import { ShieldBan, Sparkles, Users } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { UserTable } from "@/components/user-table";
import { Card, CardContent } from "@/components/ui/card";
import {
  ApiRequestError,
  blockTenantUser,
  getTenantUsersPage,
  type TenantUser,
  truncateUserId,
} from "@/lib/api";

type UserSort = "last_active" | "memory_count" | "quality_score";

type UsersPayload = {
  users: TenantUser[];
  nextCursor: string | null;
  total: number;
};

function sortUsers(users: TenantUser[], sortValue: UserSort): TenantUser[] {
  const rows = [...users];
  rows.sort((left, right) => {
    if (sortValue === "memory_count") {
      return right.memory_count - left.memory_count;
    }
    if (sortValue === "quality_score") {
      return (right.quality_score_avg ?? -1) - (left.quality_score_avg ?? -1);
    }
    const leftTime = left.last_active_at ? new Date(left.last_active_at).getTime() : 0;
    const rightTime = right.last_active_at ? new Date(right.last_active_at).getTime() : 0;
    return rightTime - leftTime;
  });
  return rows;
}

function buildUsersCsv(users: TenantUser[]): string {
  const header = ["external_user_id", "memory_count", "last_active_at", "quality_score_avg", "is_blocked"];
  const rows = users.map((user) => [
    user.external_user_id,
    String(user.memory_count),
    user.last_active_at ?? "",
    user.quality_score_avg?.toString() ?? "",
    String(user.is_blocked),
  ]);
  return [header, ...rows]
    .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function downloadCsv(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function UsersPage() {
  const { isLoaded, getToken } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageCount, setPageCount] = useState(1);
  const [sortValue, setSortValue] = useState<UserSort>("last_active");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPageCount(1);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const users = useSWR<UsersPayload>(
    isLoaded ? ["tenant-users", debouncedSearch, pageCount] : null,
    async ([, search, pages]: [string, string, number]) => {
      let cursor: string | null = null;
      const merged: TenantUser[] = [];

      for (let index = 0; index < pages; index += 1) {
        const response = await getTenantUsersPage(getToken, {
          limit: 50,
          cursor,
          search,
        });
        merged.push(...response.data);
        cursor = response.pagination.next_cursor;
        if (!cursor) {
          break;
        }
      }

      return {
        users: merged,
        nextCursor: cursor,
        total: merged.length,
      };
    },
    { refreshInterval: 30_000, keepPreviousData: true },
  );

  const filteredUsers = useMemo(() => {
    const search = debouncedSearch.toLowerCase();
    const rows = users.data?.users ?? [];
    const matches = search
      ? rows.filter((user) => user.external_user_id.toLowerCase().includes(search))
      : rows;
    return sortUsers(matches, sortValue);
  }, [debouncedSearch, sortValue, users.data?.users]);

  const metrics = useMemo(() => {
    const rows = filteredUsers;
    const avgQualityRows = rows.filter((user) => user.quality_score_avg !== null);
    return {
      totalUsers: rows.length,
      blockedUsers: rows.filter((user) => user.is_blocked).length,
      avgQuality:
        avgQualityRows.length > 0
          ? avgQualityRows.reduce((sum, user) => sum + (user.quality_score_avg ?? 0), 0) /
            avgQualityRows.length
          : 0,
      highQualityUsers: rows.filter((user) => (user.quality_score_avg ?? 0) > 0.7).length,
    };
  }, [filteredUsers]);

  async function handleBlockUser(externalUserId: string) {
    await blockTenantUser(getToken, externalUserId);
    await users.mutate();
  }

  async function handleExportCsv() {
    const token = await getToken();
    const apiBase = process.env.NEXT_PUBLIC_API_BASE;

    if (apiBase) {
      const response = await fetch(
        `${apiBase}/v1/tenant/users?format=csv${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        },
      );

      const contentType = response.headers.get("content-type") ?? "";
      if (response.ok && !contentType.includes("application/json")) {
        const text = await response.text();
        downloadCsv(text, "memoryos-tenant-users.csv");
        return;
      }
    }

    const csv = buildUsersCsv(filteredUsers);
    downloadCsv(csv, "memoryos-tenant-users.csv");
  }

  const errorMessage = (users.error as ApiRequestError | undefined)?.message;

  return (
    <div className="flex flex-col gap-6 pt-14 md:pt-0">
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
          Users
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Tenant user health
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          Search, sort, and manage proxy users without leaving the tenant workspace.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Users"
          value={metrics.totalUsers.toLocaleString("en-IN")}
          description="Loaded users in the current dashboard slice"
          icon={Users}
          loading={users.isLoading && !users.data}
          error={errorMessage}
          onRetry={() => void users.mutate()}
        />
        <MetricCard
          title="Blocked Users"
          value={metrics.blockedUsers.toLocaleString("en-IN")}
          description="Users currently blocked from new memory writes"
          icon={ShieldBan}
          loading={users.isLoading && !users.data}
          error={errorMessage}
          onRetry={() => void users.mutate()}
        />
        <MetricCard
          title="Avg Quality Score"
          value={metrics.avgQuality.toFixed(2)}
          description="Visible 7-day average across the current slice"
          icon={Sparkles}
          loading={users.isLoading && !users.data}
          error={errorMessage}
          onRetry={() => void users.mutate()}
        />
        <MetricCard
          title="Healthy Users"
          value={metrics.highQualityUsers.toLocaleString("en-IN")}
          description="Users above the 0.70 quality threshold"
          icon={Users}
          loading={users.isLoading && !users.data}
          error={errorMessage}
          onRetry={() => void users.mutate()}
        />
      </section>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <UserTable
            users={filteredUsers}
            loading={users.isLoading && !users.data}
            loadingMore={users.isValidating && Boolean(users.data)}
            error={errorMessage}
            onRetry={() => void users.mutate()}
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            sortValue={sortValue}
            onSortChange={setSortValue}
            hasMore={Boolean(users.data?.nextCursor)}
            onLoadMore={() => setPageCount((count) => count + 1)}
            onExportCsv={handleExportCsv}
            onConfirmBlock={handleBlockUser}
          />
        </CardContent>
      </Card>

      {debouncedSearch ? (
        <p className="text-sm text-slate-500">
          Searching for <span className="font-medium text-slate-700">{truncateUserId(debouncedSearch)}</span>
        </p>
      ) : null}
    </div>
  );
}
