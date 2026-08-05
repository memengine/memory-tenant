"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an error reporting service in production
    // e.g. Sentry.captureException(error)
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#050506] px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/10">
        <AlertTriangle className="size-7 text-rose-400" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Something went wrong
        </h1>
        <p className="max-w-md text-sm text-slate-400">
          An unexpected error occurred while loading this page. If the problem
          persists, try refreshing or contact support.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-slate-500">
            Error ID: {error.digest}
          </p>
        ) : null}
      </div>
      <Button
        variant="outline"
        onClick={reset}
        className="gap-2 border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
      >
        <RotateCcw className="size-4" />
        Try again
      </Button>
    </div>
  );
}
