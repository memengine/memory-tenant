"use client";

import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";

import { getConflictStats, type ConflictStats } from "@/lib/api";

export const CONFLICT_STATS_SWR_KEY = "conflict-stats";

export function useConflictStats() {
  const { isLoaded, getToken } = useAuth();

  return useSWR<ConflictStats>(
    isLoaded ? CONFLICT_STATS_SWR_KEY : null,
    () => getConflictStats(getToken),
    {
      refreshInterval: 30_000,
      revalidateOnFocus: false,
    },
  );
}
