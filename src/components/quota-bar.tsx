import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { QuotaMode } from "@/lib/api";

function getQuotaTone(percentUsed: number) {
  if (percentUsed > 85) {
    return "bg-rose-500";
  }
  if (percentUsed >= 70) {
    return "bg-amber-500";
  }
  return "bg-emerald-500";
}

export function QuotaBar({
  percentUsed,
  mode,
  callsUsed,
  callsLimit,
  loading = false,
  error,
  onRetry,
}: {
  percentUsed: number;
  mode: QuotaMode;
  callsUsed?: number;
  callsLimit?: number | null;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quota progress</CardTitle>
        <CardDescription>
          Usage is refreshed every 30 seconds. This is an operational estimate,
          not a billing invoice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-3 w-full animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="text-sm font-medium text-rose-800">{error}</div>
            {onRetry ? (
              <Button className="mt-3" variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                {callsLimit
                  ? `${callsUsed?.toLocaleString("en-IN") ?? 0} of ${callsLimit.toLocaleString("en-IN")} calls used`
                  : `${callsUsed?.toLocaleString("en-IN") ?? 0} calls used on unlimited plan`}
              </div>
              <div className="text-sm font-semibold text-slate-950">
                {percentUsed.toFixed(1)}%
              </div>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${getQuotaTone(percentUsed)}`}
                style={{ width: `${Math.min(Math.max(percentUsed, 0), 100)}%` }}
              />
            </div>

            {mode === "PASSTHROUGH" ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold">Passthrough mode active</div>
                  <div className="text-sm text-rose-900/80">
                    Writes are bypassing memory storage. Upgrade or wait for the
                    quota window to reset.
                  </div>
                </div>
                <Button className="w-full sm:w-auto">Upgrade Plan</Button>
              </div>
            ) : null}

            {mode === "DEGRADED_RETRIEVE" ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <div className="text-sm font-semibold">New memories paused</div>
                <div className="text-sm text-amber-900/80">
                  Retrieval is operating in a degraded state. New memories may be
                  temporarily queued until the service fully recovers.
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
