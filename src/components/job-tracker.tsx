"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TokenGetter = () => Promise<string | null>;

type JobStatus = "queued" | "processing" | "complete" | "dead" | "unknown";

type JobTrackerPayload = {
  status?: string;
  memories_extracted?: number;
  extracted_count?: number;
  memories_created?: number;
  memory_count?: number;
  error?: string | null;
  error_message?: string | null;
  details?: {
    status?: string;
    memories_extracted?: number;
    extracted_count?: number;
    memories_created?: number;
    memory_count?: number;
    error?: string | null;
    error_message?: string | null;
  };
  data?: {
    status?: string;
    memories_extracted?: number;
    extracted_count?: number;
    memories_created?: number;
    memory_count?: number;
    error?: string | null;
    error_message?: string | null;
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

function normalizeStatus(value?: string): JobStatus {
  const normalized = (value ?? "").toLowerCase();
  if (
    normalized === "completed" ||
    normalized === "complete" ||
    normalized === "done" ||
    normalized === "processed"
  ) {
    return "complete";
  }
  if (normalized === "dead") {
    return "dead";
  }
  if (normalized === "failed" || normalized === "error") {
    return "processing";
  }
  if (normalized === "queued" || normalized === "pending") {
    return "queued";
  }
  if (normalized === "processing" || normalized === "running") {
    return "processing";
  }
  return "unknown";
}

function getStatusClassName(status: JobStatus): string {
  if (status === "complete") {
    return "border-emerald-200 bg-emerald-100 text-emerald-800";
  }
  if (status === "dead") {
    return "border-rose-200 bg-rose-100 text-rose-800";
  }
  if (status === "processing") {
    return "border-sky-200 bg-sky-100 text-sky-800";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function unwrapPayload(payload: JobTrackerPayload) {
  return payload.data ?? payload.details ?? payload;
}

export function JobTracker({
  jobId,
  getToken,
}: {
  jobId: string | null;
  getToken: TokenGetter;
}) {
  const [status, setStatus] = useState<JobStatus>("queued");
  const [memoryCount, setMemoryCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const shouldPoll = useMemo(
    () => Boolean(jobId) && status !== "complete" && status !== "dead" && !timedOut,
    [jobId, status, timedOut],
  );

  async function checkStatus() {
    if (!jobId || !API_BASE) {
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE}/v1/memories/jobs/${encodeURIComponent(jobId)}`,
        {
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Status request failed with ${response.status}`);
      }

      const payload = unwrapPayload((await response.json()) as JobTrackerPayload);
      const nextStatus = normalizeStatus(payload.status);
      setStatus(nextStatus);
      setMemoryCount(
        payload.memories_extracted ??
          payload.extracted_count ??
          payload.memories_created ??
          payload.memory_count ??
          null,
      );
      setErrorMessage(payload.error_message ?? payload.error ?? null);
    } catch (caught) {
      setErrorMessage(
        caught instanceof Error ? caught.message : "Unable to check job status.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!jobId) {
      return;
    }
    setStartedAt(Date.now());
    setTimedOut(false);
    setStatus("queued");
    setMemoryCount(null);
    setErrorMessage(null);
    void checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    if (!shouldPoll || !startedAt) {
      return;
    }
    const interval = window.setInterval(() => {
      if (Date.now() - startedAt >= 60_000) {
        setTimedOut(true);
        window.clearInterval(interval);
        return;
      }
      void checkStatus();
    }, 3_000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPoll, startedAt]);

  if (!jobId) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Extraction Job
          </p>
          <p className="mt-1 font-mono text-sm text-slate-800">Job ID: {jobId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getStatusClassName(status)}>
            {status}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void checkStatus()}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Check Status
          </Button>
        </div>
      </div>

      <div className="mt-4 text-sm">
        {status === "complete" ? (
          <p className="text-emerald-700">
            {memoryCount ?? 0} memories extracted.
          </p>
        ) : null}
        {status === "dead" ? (
          <p className="text-rose-700">
            Extraction failed{errorMessage ? `: ${errorMessage}` : "."}{" "}
            <Link className="font-semibold underline" href="/quality-log">
              Open Quality Log
            </Link>
          </p>
        ) : null}
        {timedOut && status !== "complete" && status !== "dead" ? (
          <p className="text-amber-700">
            Taking longer than expected.{" "}
            <Link className="font-semibold underline" href="/quality-log">
              Check Quality Log.
            </Link>
          </p>
        ) : null}
        {errorMessage && status !== "dead" && !timedOut ? (
          <p className="mt-2 text-amber-700">
            Retrying after provider error. MemoryOS will keep checking this job.
          </p>
        ) : null}
      </div>
    </div>
  );
}
