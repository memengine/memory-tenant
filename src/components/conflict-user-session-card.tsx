"use client";

import { MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { SharedContextConflict } from "@/lib/api";

function truncateUserId(value?: string | null) {
  return value ? `${value.slice(0, 8)}***` : "unknown";
}

function entityLabel(value: string) {
  return value.replaceAll("_", " ");
}

function expiresInDays(conflict: SharedContextConflict) {
  const start = new Date(conflict.auto_resolution_at ?? conflict.detected_at);
  if (Number.isNaN(start.getTime())) {
    return 30;
  }
  const expiresAt = start.getTime() + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

function progressLabel(conflict: SharedContextConflict) {
  if (conflict.status === "resolved") {
    return "Resolved";
  }
  if (conflict.status === "clarification_queued") {
    return "Waiting for next session";
  }
  return "Question asked - awaiting response";
}

export function ConflictUserSessionCard({
  conflict,
}: {
  conflict: SharedContextConflict;
}) {
  return (
    <Card className="border-sky-200 bg-sky-50/70">
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <MessageCircle className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-sky-200 bg-white text-sky-800">
              {entityLabel(conflict.entity_type)}
            </Badge>
            <span className="text-sm font-semibold text-slate-950">
              Resolving through the user&apos;s next session
            </span>
          </div>
          <p className="text-sm leading-6 text-slate-700">
            User {truncateUserId(conflict.user_a_id)}&apos;s memory about{" "}
            {entityLabel(conflict.entity_type)} will be confirmed naturally in
            their next session.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-medium text-amber-800">
              <span className="size-2 animate-pulse rounded-full bg-amber-500" />
              {progressLabel(conflict)}
            </span>
            <span className="text-slate-500">
              Expires in {expiresInDays(conflict)} days if not addressed
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
