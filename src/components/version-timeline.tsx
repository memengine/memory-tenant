"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type MemoryVersionEntry = {
  id?: string;
  version_number: number;
  content: string;
  category?: string;
  importance_score?: number;
  confidence?: number;
  change_type: string;
  change_reason?: string | null;
  changed_by?: string | null;
  created_at: string;
};

const CHANGE_TYPE_STYLES: Record<string, string> = {
  created: "border-emerald-200 bg-emerald-100 text-emerald-800",
  conflict_update: "border-amber-200 bg-amber-100 text-amber-800",
  importance_decay: "border-rose-200 bg-rose-100 text-rose-800",
  importance_boost: "border-emerald-200 bg-emerald-100 text-emerald-800",
  archived: "border-slate-200 bg-slate-100 text-slate-700",
  manual_edit: "border-sky-200 bg-sky-100 text-sky-800",
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

function formatRelativeTime(value: string): string {
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) {
    return "unknown time";
  }
  const seconds = Math.max(0, Math.floor((Date.now() - date) / 1000));
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo ago`;
  }
  return `${Math.floor(months / 12)}y ago`;
}

function formatChangeType(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function VersionTimeline({ versions }: { versions: MemoryVersionEntry[] }) {
  const [expandedVersions, setExpandedVersions] = useState<Set<number>>(
    () => new Set(),
  );

  if (versions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        No version history was returned for this memory.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {versions.length === 1 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          No changes - this memory has not been modified since creation.
        </div>
      ) : null}

      <div className="relative space-y-5 before:absolute before:bottom-0 before:left-4 before:top-1 before:w-px before:bg-slate-200">
        {versions.map((version) => {
          const isExpanded = expandedVersions.has(version.version_number);
          const style =
            CHANGE_TYPE_STYLES[version.change_type] ??
            "border-slate-200 bg-slate-100 text-slate-700";

          return (
            <div key={`${version.version_number}-${version.created_at}`} className="relative pl-10">
              <div className="absolute left-0 top-1 flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm">
                V{version.version_number}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge variant="outline" className={style}>
                    {formatChangeType(version.change_type)}
                  </Badge>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(version.created_at)} -{" "}
                    {formatRelativeTime(version.created_at)}
                  </div>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  {(version.change_reason ?? "").trim() ||
                    "No change reason captured."}
                </p>

                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setExpandedVersions((current) => {
                        const next = new Set(current);
                        if (next.has(version.version_number)) {
                          next.delete(version.version_number);
                        } else {
                          next.add(version.version_number);
                        }
                        return next;
                      });
                    }}
                  >
                    {isExpanded ? "Hide content" : "Show content"}
                  </Button>
                  {isExpanded ? (
                    <div className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-100">
                      {version.content}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

