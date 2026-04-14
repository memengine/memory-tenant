import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  loading = false,
  error,
  onRetry,
}: {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="min-h-[170px]">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-base text-slate-950">{title}</CardTitle>
        </div>
        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end">
        {loading ? (
          <div className="space-y-3">
            <div className="h-8 w-28 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          </div>
        ) : error ? (
          <div className="space-y-3">
            <div className="text-sm font-medium text-rose-700">{error}</div>
            {onRetry ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-3xl font-semibold tracking-tight text-slate-950">
              {value}
            </div>
            <p className="text-sm text-slate-600">{description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
