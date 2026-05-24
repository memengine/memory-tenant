"use client";

import { UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SharedContextConflict } from "@/lib/api";

function truncateUserId(value?: string | null) {
  return value ? `${value.slice(0, 8)}***` : "unknown";
}

function entityLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatRelativeTime(value?: string | null) {
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

function confirmArchive({
  kept,
  archived,
}: {
  kept: string;
  archived: string;
}) {
  return window.confirm(
    `Confirm: ${kept}\n\nis the current organisational truth?\n\n${archived}\n\nwill be archived.`,
  );
}

export function ConflictTenantReviewCard({
  conflict,
  busy,
  onResolve,
}: {
  conflict: SharedContextConflict;
  busy: boolean;
  onResolve: (correctUser: "A" | "B" | "both_valid") => void;
}) {
  const userA = truncateUserId(conflict.user_a_id);
  const userB = truncateUserId(conflict.user_b_id);
  const memoryA = conflict.memory_a_content ?? "Memory content unavailable.";
  const memoryB = conflict.memory_b_content ?? "Memory content unavailable.";

  return (
    <Card className="border-amber-200 bg-white" id={`conflict-${conflict.id}`}>
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <UserCheck className="size-5" />
            </div>
            <div>
              <Badge className="border-amber-200 bg-amber-50 text-amber-800">
                {entityLabel(conflict.entity_type)} conflict
              </Badge>
              <p className="mt-1 text-sm text-slate-500">
                Detected {formatRelativeTime(conflict.detected_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">
              User {userA} told your AI:
            </p>
            <blockquote className="mt-3 text-sm leading-6 text-slate-700">
              &ldquo;{memoryA}&rdquo;
            </blockquote>
            <p className="mt-3 text-xs text-slate-500">
              {formatRelativeTime(conflict.memory_a_created_at)}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-slate-950">
              User {userB} told your AI:
            </p>
            <blockquote className="mt-3 text-sm leading-6 text-slate-800">
              &ldquo;{memoryB}&rdquo;
            </blockquote>
            <p className="mt-3 text-xs text-amber-800/70">
              {formatRelativeTime(conflict.memory_b_created_at)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-medium text-sky-950">
          Which reflects your organisation&apos;s current reality?
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="border-sky-200 text-sky-800"
            onClick={() => {
              if (confirmArchive({ kept: memoryA, archived: memoryB })) {
                onResolve("A");
              }
            }}
          >
            {userA}&apos;s version is current
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="border-sky-200 text-sky-800"
            onClick={() => {
              if (confirmArchive({ kept: memoryB, archived: memoryA })) {
                onResolve("B");
              }
            }}
          >
            {userB}&apos;s version is current
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="border-slate-200 text-slate-700"
            onClick={() => onResolve("both_valid")}
          >
            Both are valid - different contexts
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
