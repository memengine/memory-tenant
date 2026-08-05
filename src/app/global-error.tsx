"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an error reporting service in production
    // e.g. Sentry.captureException(error)
    console.error("[GlobalErrorBoundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#050506] px-4 text-center text-white">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="max-w-md text-sm text-slate-400">
            A critical error occurred. Please try refreshing the page.
          </p>
          {error.digest ? (
            <p className="font-mono text-xs text-slate-500">
              Error ID: {error.digest}
            </p>
          ) : null}
        </div>
        <button
          onClick={reset}
          className="rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
