"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";

import {
  VersionTimeline,
  type MemoryVersionEntry,
} from "@/components/version-timeline";
import { Button } from "@/components/ui/button";

type TokenGetter = () => Promise<string | null>;

type HistoryResponse =
  | { data?: MemoryVersionEntry[] }
  | { versions?: MemoryVersionEntry[] }
  | MemoryVersionEntry[];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

function normalizeHistory(payload: HistoryResponse): MemoryVersionEntry[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if ("data" in payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  if ("versions" in payload && Array.isArray(payload.versions)) {
    return payload.versions;
  }
  return [];
}

export function MemoryHistorySlideover({
  memoryId,
  open,
  onClose,
  getToken,
}: {
  memoryId: string | null;
  open: boolean;
  onClose: () => void;
  getToken: TokenGetter;
}) {
  const [versions, setVersions] = useState<MemoryVersionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shortMemoryId = useMemo(
    () => (memoryId ? memoryId.slice(0, 8) : ""),
    [memoryId],
  );

  useEffect(() => {
    if (!open || !memoryId) {
      return;
    }

    let cancelled = false;
    const targetMemoryId = memoryId;

    async function loadHistory() {
      if (!API_BASE) {
        setError("NEXT_PUBLIC_API_BASE is not configured.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const response = await fetch(
          `${API_BASE}/v1/memories/${encodeURIComponent(targetMemoryId)}/history`,
          {
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );

        if (!response.ok) {
          let message = `History request failed with status ${response.status}`;
          try {
            const payload = (await response.json()) as {
              error?: string;
              detail?: string;
            };
            message = payload.error ?? payload.detail ?? message;
          } catch {
            // Keep the default message.
          }
          throw new Error(message);
        }

        const payload = (await response.json()) as HistoryResponse;
        if (!cancelled) {
          setVersions(normalizeHistory(payload));
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Failed to load history.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [getToken, memoryId, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
      <button
        type="button"
        aria-label="Close memory history"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
              Memory History
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Memory {shortMemoryId}
            </h2>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            <X className="mr-2 size-4" />
            Close
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-5 text-sm text-slate-600">
              <Loader2 className="size-4 animate-spin" />
              Loading memory history...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-800">
              {error}
            </div>
          ) : (
            <VersionTimeline versions={versions} />
          )}
        </div>
      </aside>
    </div>
  );
}
