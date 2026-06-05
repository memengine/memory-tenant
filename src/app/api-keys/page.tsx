"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import { KeyRound, ShieldCheck, TimerReset, Trash2 } from "lucide-react";

import { CreateKeyDialog } from "@/components/create-key-dialog";
import { MetricCard } from "@/components/metric-card";
import { RevealKeyDialog } from "@/components/reveal-key-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createApiKey,
  displayApiError,
  listApiKeys,
  revokeApiKey,
  type ApiKeyData,
} from "@/lib/api";

function formatAbsoluteDate(value: string | null): string {
  if (!value) {
    return "Never";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRelativeTime(value: string | null): string {
  if (!value) {
    return "Never";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, size] of ranges) {
    if (Math.abs(seconds) >= size || unit === "minute") {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }

  return "just now";
}

function isOlderThan30Days(value: string | null): boolean {
  if (!value) {
    return false;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return Date.now() - date.getTime() > 30 * 24 * 60 * 60 * 1000;
}

function buildMaskedPrefix(rawKey: string): string {
  return rawKey.length >= 10 ? `${rawKey.slice(0, 10)}***` : `${rawKey}***`;
}

type ApiKeysPayload = {
  rows: ApiKeyData[];
  total: number;
};

export default function ApiKeysPage() {
  const { isLoaded, getToken } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<ApiKeyData | null>(null);
  const [busyAction, setBusyAction] = useState<"create" | "revoke" | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [revealedPrefixes, setRevealedPrefixes] = useState<Record<string, string>>({});

  const apiKeys = useSWR<ApiKeysPayload>(
    isLoaded ? "tenant-api-keys-screen" : null,
    async () => {
      const response = await listApiKeys(getToken, { limit: 50 });
      return {
        rows: response.data,
        total: response.pagination.total,
      };
    },
    { refreshInterval: 30_000 },
  );

  const rows = useMemo(() => apiKeys.data?.rows ?? [], [apiKeys.data?.rows]);
  const errorMessage = displayApiError(apiKeys.error);

  const metrics = useMemo(() => {
    return {
      active: rows.filter((row) => row.is_active).length,
      revoked: rows.filter((row) => !row.is_active).length,
      maxRate: Math.max(...rows.map((row) => row.rate_limit_per_minute), 0),
      scoped: rows.filter((row) => row.permissions.length > 0).length,
    };
  }, [rows]);

  async function handleCreate(payload: { name: string; permissions: string[] }) {
    setBusyAction("create");
    setSaveMessage(null);
    try {
      const created = await createApiKey(getToken, {
        name: payload.name,
        permissions: payload.permissions,
      });
      setRevealedPrefixes((current) => ({
        ...current,
        [created.id]: buildMaskedPrefix(created.raw_key),
      }));
      setRawKey(created.raw_key);
      setCreateOpen(false);
      setRevealOpen(true);
    } catch (error) {
      setSaveMessage(displayApiError(error) ?? "Unable to create API key.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRevoke() {
    if (!pendingRevoke) {
      return;
    }
    setBusyAction("revoke");
    setSaveMessage(null);
    try {
      await revokeApiKey(getToken, pendingRevoke.id);
      setPendingRevoke(null);
      await apiKeys.mutate();
      setSaveMessage("API key revoked.");
    } catch (error) {
      setSaveMessage(displayApiError(error) ?? "Unable to revoke API key.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 pt-14 md:pt-0">
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
          API Keys
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          SDK access control
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          Create, reveal once, and revoke API keys for your backend integrations.
        </p>
      </div>

      {saveMessage ? (
        <Card className="border border-slate-200 bg-slate-50">
          <CardContent className="py-4 text-sm text-slate-700">{saveMessage}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Active Keys"
          value={metrics.active.toLocaleString("en-IN")}
          description="Currently valid API keys"
          icon={KeyRound}
          loading={apiKeys.isLoading && !apiKeys.data}
          error={errorMessage}
          onRetry={() => void apiKeys.mutate()}
        />
        <MetricCard
          title="Revoked Keys"
          value={metrics.revoked.toLocaleString("en-IN")}
          description="Keys that can no longer authenticate"
          icon={Trash2}
          loading={apiKeys.isLoading && !apiKeys.data}
          error={errorMessage}
          onRetry={() => void apiKeys.mutate()}
        />
        <MetricCard
          title="Max Rate Limit"
          value={`${metrics.maxRate}/min`}
          description="Highest allowed rate across current keys"
          icon={TimerReset}
          loading={apiKeys.isLoading && !apiKeys.data}
          error={errorMessage}
          onRetry={() => void apiKeys.mutate()}
        />
        <MetricCard
          title="Scoped Keys"
          value={metrics.scoped.toLocaleString("en-IN")}
          description="Keys with explicit permission scopes"
          icon={ShieldCheck}
          loading={apiKeys.isLoading && !apiKeys.data}
          error={errorMessage}
          onRetry={() => void apiKeys.mutate()}
        />
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>API keys</CardTitle>
            <CardDescription>
              Raw keys are shown only once after creation. Existing rows expose metadata only.
            </CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)}>Create API Key</Button>
        </CardHeader>
        <CardContent>
          {apiKeys.isLoading && !apiKeys.data ? (
            <div className="space-y-3">
              <div className="h-10 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-200" />
            </div>
          ) : apiKeys.error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="text-sm font-medium text-rose-800">{errorMessage}</div>
              <Button className="mt-3" variant="outline" onClick={() => void apiKeys.mutate()}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Prefix</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length > 0 ? (
                    rows.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium text-slate-900">{key.name}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">
                          {revealedPrefixes[key.id] ?? "Hidden by API"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {key.permissions.map((permission) => (
                              <Badge key={permission} variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
                                {permission}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">{formatAbsoluteDate(key.created_at)}</TableCell>
                        <TableCell className={isOlderThan30Days(key.last_used_at) ? "text-amber-700" : "text-slate-600"}>
                          {formatRelativeTime(key.last_used_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPendingRevoke(key)}
                            disabled={!key.is_active}
                          >
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                        No API keys created yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        busy={busyAction === "create"}
        onSubmit={handleCreate}
      />

      <RevealKeyDialog
        open={revealOpen}
        rawKey={rawKey}
        onOpenChange={setRevealOpen}
        onCloseComplete={() => {
          setRawKey(null);
          void apiKeys.mutate();
        }}
      />

      <Dialog open={Boolean(pendingRevoke)} onOpenChange={(open) => !open && setPendingRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API key</DialogTitle>
            <DialogDescription>
              This will immediately stop all API calls using this key.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button variant="destructive" onClick={() => void handleRevoke()} disabled={busyAction === "revoke"}>
              {busyAction === "revoke" ? "Revoking..." : "Confirm revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
