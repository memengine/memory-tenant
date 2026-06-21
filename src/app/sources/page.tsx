"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import {
  Activity,
  FileKey2,
  Filter,
  GitCompareArrows,
  Network,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createServiceWriter,
  displayApiError,
  listApiKeys,
  listMemoryClaims,
  listServiceWriters,
  listSourceEvents,
  updateServiceWriter,
  type ApiKeyData,
  type AuthorityRules,
  type EvidenceReference,
  type MemoryClaim,
  type MemorySourceEvent,
  type ServiceWriter,
} from "@/lib/api";

const MEMORY_CATEGORIES = [
  "fact",
  "preference",
  "goal",
  "procedure",
  "relationship",
  "expertise",
] as const;

type WriterFormState = {
  serviceKey: string;
  displayName: string;
  apiKeyId: string;
  defaultPriority: string;
  categoryPriorities: Record<string, string>;
};

function emptyWriterForm(): WriterFormState {
  return {
    serviceKey: "",
    displayName: "",
    apiKeyId: "unbound",
    defaultPriority: "50",
    categoryPriorities: {},
  };
}

function formFromWriter(writer: ServiceWriter): WriterFormState {
  return {
    serviceKey: writer.service_key,
    displayName: writer.display_name,
    apiKeyId: writer.api_key_id ?? "unbound",
    defaultPriority: String(writer.authority_rules.default_priority ?? 50),
    categoryPriorities: Object.fromEntries(
      Object.entries(writer.authority_rules.categories ?? {}).map(([key, value]) => [
        key,
        String(value),
      ]),
    ),
  };
}

function numberInRange(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function rulesFromForm(form: WriterFormState): AuthorityRules {
  const categories = Object.fromEntries(
    Object.entries(form.categoryPriorities)
      .filter(([, value]) => value.trim() !== "")
      .map(([key, value]) => [key, numberInRange(value, 50)]),
  );
  return {
    default_priority: numberInRange(form.defaultPriority, 50),
    categories,
    domain_fields: {},
  };
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function shortHash(value: string): string {
  return value.length > 16 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}

function WriterDialog({
  open,
  writer,
  apiKeys,
  busy,
  error,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  writer: ServiceWriter | null;
  apiKeys: ApiKeyData[];
  busy: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: WriterFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<WriterFormState>(() =>
    writer ? formFromWriter(writer) : emptyWriterForm(),
  );

  const formKey = writer?.id ?? "new";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={formKey} className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{writer ? "Edit service writer" : "Register service writer"}</DialogTitle>
          <DialogDescription>
            A writer identifies the backend service that observed a fact. Bind a dedicated API
            key when the service is ready for production traffic.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-800">Service key</span>
            <Input
              value={form.serviceKey}
              disabled={Boolean(writer)}
              placeholder="billing-service"
              onChange={(event) =>
                setForm((current) => ({ ...current, serviceKey: event.target.value }))
              }
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-800">Display name</span>
            <Input
              value={form.displayName}
              placeholder="Billing Service"
              onChange={(event) =>
                setForm((current) => ({ ...current, displayName: event.target.value }))
              }
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-800">Bound API key</span>
            <Select
              value={form.apiKeyId}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, apiKeyId: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an API key" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unbound">Not bound yet</SelectItem>
                {apiKeys
                  .filter((key) => key.is_active)
                  .map((key) => (
                    <SelectItem key={key.id} value={key.id}>
                      {key.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-800">Default authority</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.defaultPriority}
              onChange={(event) =>
                setForm((current) => ({ ...current, defaultPriority: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Category authority</div>
            <div className="text-xs text-slate-500">
              Leave a category blank to use the default. Higher values win deterministic
              conflicts.
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {MEMORY_CATEGORIES.map((category) => (
              <label key={category} className="space-y-1.5">
                <span className="text-xs font-medium capitalize text-slate-700">{category}</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder={form.defaultPriority}
                  value={form.categoryPriorities[category] ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      categoryPriorities: {
                        ...current.categoryPriorities,
                        [category]: event.target.value,
                      },
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <DialogFooter showCloseButton>
          <Button
            disabled={
              busy ||
              !form.displayName.trim() ||
              (!writer && !/^[a-z0-9][a-z0-9._-]*$/.test(form.serviceKey))
            }
            onClick={() => void onSubmit(form)}
          >
            {busy ? "Saving..." : writer ? "Save changes" : "Register writer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EvidenceList({ event }: { event: MemorySourceEvent }) {
  return <EvidenceRefsList refs={event.evidence_refs} />;
}

function EvidenceRefsList({ refs }: { refs: EvidenceReference[] }) {
  if (refs.length === 0) {
    return <span className="text-slate-400">No references</span>;
  }
  return (
    <div className="flex max-w-xs flex-wrap gap-1.5">
      {refs.map((evidence, index) => (
        <Badge
          key={`${evidence.source_type}-${evidence.reference}-${index}`}
          variant="outline"
          className="max-w-full border-slate-200 bg-slate-50 text-slate-700"
          title={evidence.reference}
        >
          {evidence.source_type}: {evidence.reference}
        </Badge>
      ))}
    </div>
  );
}

function ClaimStatusBadge({ status }: { status: MemoryClaim["status"] }) {
  const styles = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-800",
    disputed: "border-amber-200 bg-amber-50 text-amber-800",
    superseded: "border-slate-200 bg-slate-100 text-slate-600",
    archived: "border-slate-200 bg-slate-100 text-slate-600",
  }[status];
  return (
    <Badge variant="outline" className={styles}>
      {status}
    </Badge>
  );
}

function ClaimCard({ claim }: { claim: MemoryClaim }) {
  const winningRevisionId = claim.winning_revision_id;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <ClaimStatusBadge status={claim.status} />
            <Badge variant="outline" className="capitalize">
              {claim.category}
            </Badge>
            <span className="font-mono text-xs text-slate-400">
              {shortHash(claim.claim_fingerprint)}
            </span>
          </div>
          <h3 className="text-base font-semibold text-slate-950">
            {claim.predicate_key}
          </h3>
          <div className="text-sm text-slate-600">
            User <span className="font-mono text-slate-800">{claim.external_user_id}</span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Active value
          </div>
          <div className="mt-1 max-w-md break-words font-medium text-slate-950">
            {claim.active_value ?? "No active value"}
          </div>
          {claim.status === "disputed" ? (
            <Button asChild variant="outline" size="sm" className="mt-3 border-amber-300 bg-white">
              <Link href="/conflicts">Resolve in Conflicts</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Authority
          </div>
          <div className="mt-1 text-sm font-medium text-slate-900">
            {claim.authority_priority}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Confidence
          </div>
          <div className="mt-1 text-sm font-medium text-slate-900">
            {claim.confidence_score.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Observed
          </div>
          <div className="mt-1 text-sm font-medium text-slate-900">
            {claim.observed_at ? formatDate(claim.observed_at) : "Unknown"}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Revisions
        </div>
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {claim.revisions.length ? (
            claim.revisions.map((revision) => (
              <div
                key={revision.id}
                className={
                  revision.id === winningRevisionId
                    ? "bg-emerald-50/70 p-3"
                    : revision.status === "disputed"
                      ? "bg-amber-50/70 p-3"
                      : "p-3"
                }
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{revision.status}</Badge>
                      {revision.id === winningRevisionId ? (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-800">
                          current winner
                        </Badge>
                      ) : null}
                      {revision.source_service ? (
                        <span className="text-xs font-medium text-slate-600">
                          {revision.source_service}
                        </span>
                      ) : null}
                      {revision.source_domain && revision.source_field ? (
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {revision.source_domain}.{revision.source_field}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-2 break-words text-sm font-medium text-slate-950">
                      {revision.asserted_value}
                    </div>
                    {revision.source_event_key ? (
                      <div className="mt-1 max-w-xl truncate font-mono text-xs text-slate-500">
                        {revision.source_event_key}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs text-slate-500 sm:text-right">
                    <div>authority {revision.authority_priority}</div>
                    <div>confidence {revision.confidence_score.toFixed(2)}</div>
                    <div>{revision.observed_at ? formatDate(revision.observed_at) : formatDate(revision.created_at)}</div>
                  </div>
                </div>
                <div className="mt-2">
                  <EvidenceRefsList refs={revision.evidence_refs} />
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-sm text-slate-500">No revisions recorded.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SourcesPage() {
  const { isLoaded, getToken } = useAuth();
  const [writerDialogOpen, setWriterDialogOpen] = useState(false);
  const [editingWriter, setEditingWriter] = useState<ServiceWriter | null>(null);
  const [writerBusy, setWriterBusy] = useState(false);
  const [writerError, setWriterError] = useState<string | null>(null);
  const [eventUserDraft, setEventUserDraft] = useState("");
  const [eventServiceDraft, setEventServiceDraft] = useState("all");
  const [eventFilters, setEventFilters] = useState({
    externalUserId: "",
    sourceService: "all",
  });
  const [claimUserDraft, setClaimUserDraft] = useState("");
  const [claimStatusDraft, setClaimStatusDraft] = useState("all");
  const [claimCategoryDraft, setClaimCategoryDraft] = useState("all");
  const [claimFilters, setClaimFilters] = useState({
    externalUserId: "",
    status: "all",
    category: "all",
  });

  const writers = useSWR(
    isLoaded ? "tenant-service-writers" : null,
    () => listServiceWriters(getToken),
    { refreshInterval: 30_000 },
  );
  const apiKeys = useSWR(
    isLoaded ? "tenant-source-api-keys" : null,
    () => listApiKeys(getToken, { limit: 50 }),
    { refreshInterval: 30_000 },
  );
  const events = useSWR(
    isLoaded
      ? ["tenant-source-events", eventFilters.externalUserId, eventFilters.sourceService]
      : null,
    () =>
      listSourceEvents(getToken, {
        externalUserId: eventFilters.externalUserId || undefined,
        sourceService:
          eventFilters.sourceService === "all" ? undefined : eventFilters.sourceService,
        limit: 100,
      }),
    { refreshInterval: 15_000 },
  );
  const claims = useSWR(
    isLoaded
      ? ["tenant-memory-claims", claimFilters.externalUserId, claimFilters.status, claimFilters.category]
      : null,
    () =>
      listMemoryClaims(getToken, {
        externalUserId: claimFilters.externalUserId || undefined,
        status: claimFilters.status,
        category: claimFilters.category,
        limit: 50,
      }),
    { refreshInterval: 15_000 },
  );

  const writerRows = useMemo(() => writers.data ?? [], [writers.data]);
  const eventRows = useMemo(() => events.data ?? [], [events.data]);
  const claimRows = useMemo(() => claims.data ?? [], [claims.data]);
  const activeKeys = apiKeys.data?.data ?? [];
  const errorMessage = displayApiError(writers.error ?? events.error ?? claims.error ?? apiKeys.error);
  const metrics = useMemo(
    () => ({
      activeWriters: writerRows.filter((writer) => writer.is_active).length,
      boundWriters: writerRows.filter((writer) => writer.api_key_id).length,
      events: eventRows.length,
      services: new Set(eventRows.map((event) => event.source_service)).size,
      disputedClaims: claimRows.filter((claim) => claim.status === "disputed").length,
    }),
    [claimRows, eventRows, writerRows],
  );

  function openCreateWriter() {
    setEditingWriter(null);
    setWriterError(null);
    setWriterDialogOpen(true);
  }

  function openEditWriter(writer: ServiceWriter) {
    setEditingWriter(writer);
    setWriterError(null);
    setWriterDialogOpen(true);
  }

  async function saveWriter(form: WriterFormState) {
    setWriterBusy(true);
    setWriterError(null);
    try {
      const payload = {
        display_name: form.displayName.trim(),
        api_key_id: form.apiKeyId === "unbound" ? null : form.apiKeyId,
        authority_rules: rulesFromForm(form),
      };
      if (editingWriter) {
        await updateServiceWriter(getToken, editingWriter.id, payload);
      } else {
        await createServiceWriter(getToken, {
          service_key: form.serviceKey.trim(),
          ...payload,
        });
      }
      setWriterDialogOpen(false);
      setEditingWriter(null);
      await Promise.all([writers.mutate(), events.mutate()]);
    } catch (error) {
      setWriterError(displayApiError(error) ?? "Unable to save service writer.");
    } finally {
      setWriterBusy(false);
    }
  }

  async function toggleWriter(writer: ServiceWriter) {
    setWriterError(null);
    try {
      await updateServiceWriter(getToken, writer.id, { is_active: !writer.is_active });
      await writers.mutate();
    } catch (error) {
      setWriterError(displayApiError(error) ?? "Unable to update service writer.");
    }
  }

  return (
    <div className="flex flex-col gap-6 pt-14 md:pt-0">
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
          Sources
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Memory provenance
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          Define which backend services write memory, how authoritative they are, and
          inspect the evidence trail behind recent extraction events.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Active Writers"
          value={metrics.activeWriters.toLocaleString("en-IN")}
          description="Services currently allowed to identify as a writer"
          icon={Network}
          loading={writers.isLoading && !writers.data}
          error={errorMessage}
          onRetry={() => void writers.mutate()}
        />
        <MetricCard
          title="Credential Bound"
          value={metrics.boundWriters.toLocaleString("en-IN")}
          description="Writers restricted to one tenant API key"
          icon={FileKey2}
          loading={writers.isLoading && !writers.data}
          error={errorMessage}
          onRetry={() => void writers.mutate()}
        />
        <MetricCard
          title="Recent Events"
          value={metrics.events.toLocaleString("en-IN")}
          description="Source events in the current 100-row view"
          icon={Activity}
          loading={events.isLoading && !events.data}
          error={errorMessage}
          onRetry={() => void events.mutate()}
        />
        <MetricCard
          title="Disputed Claims"
          value={metrics.disputedClaims.toLocaleString("en-IN")}
          description="Claim records where trusted sources disagree"
          icon={GitCompareArrows}
          loading={claims.isLoading && !claims.data}
          error={errorMessage}
          onRetry={() => void claims.mutate()}
        />
      </section>

      <Tabs defaultValue="writers">
        <TabsList className="h-10">
          <TabsTrigger value="writers" className="px-4">Service writers</TabsTrigger>
          <TabsTrigger value="events" className="px-4">Source events</TabsTrigger>
          <TabsTrigger value="claims" className="px-4">Claim ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="writers">
          <Card>
            <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Service writers</CardTitle>
                <CardDescription>
                  Give each production service a stable identity and explicit source-of-truth
                  priority.
                </CardDescription>
              </div>
              <Button onClick={openCreateWriter}>
                <Plus className="mr-2 size-4" />
                Register writer
              </Button>
            </CardHeader>
            <CardContent>
              {writerError && !writerDialogOpen ? (
                <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {writerError}
                </div>
              ) : null}
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Credential</TableHead>
                      <TableHead>Authority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {writerRows.length ? (
                      writerRows.map((writer) => {
                        const boundKey = activeKeys.find((key) => key.id === writer.api_key_id);
                        return (
                          <TableRow key={writer.id}>
                            <TableCell>
                              <div className="font-medium text-slate-900">{writer.display_name}</div>
                              <div className="font-mono text-xs text-slate-500">{writer.service_key}</div>
                            </TableCell>
                            <TableCell>
                              {writer.api_key_id ? (
                                <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
                                  {boundKey?.name ?? "Bound key"}
                                </Badge>
                              ) : (
                                <span className="text-slate-500">Unbound</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="size-4 text-emerald-600" />
                                <span className="font-medium">
                                  {writer.authority_rules.default_priority ?? 50}
                                </span>
                                <span className="text-xs text-slate-500">
                                  default
                                </span>
                              </div>
                              {Object.keys(writer.authority_rules.categories ?? {}).length ? (
                                <div className="mt-1 text-xs text-slate-500">
                                  {Object.keys(writer.authority_rules.categories).length} category overrides
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  writer.is_active
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                    : "border-slate-200 bg-slate-100 text-slate-600"
                                }
                              >
                                {writer.is_active ? "Active" : "Disabled"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {formatDate(writer.updated_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="icon-sm" title="Edit writer" onClick={() => openEditWriter(writer)}>
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon-sm"
                                  title={writer.is_active ? "Disable writer" : "Enable writer"}
                                  onClick={() => void toggleWriter(writer)}
                                >
                                  <Power className={writer.is_active ? "size-4 text-rose-600" : "size-4 text-emerald-600"} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-slate-500">
                          No service writers yet. Register the first backend service that sends
                          memory events.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Source events</CardTitle>
              <CardDescription>
                Trace recent writes back to the service, event ID, observation time, and
                supporting references.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-end">
                <label className="flex-1 space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    External user ID
                  </span>
                  <Input
                    placeholder="customer_001"
                    value={eventUserDraft}
                    onChange={(event) => setEventUserDraft(event.target.value)}
                  />
                </label>
                <label className="min-w-56 space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Source service
                  </span>
                  <Select value={eventServiceDraft} onValueChange={setEventServiceDraft}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All services</SelectItem>
                      {writerRows.map((writer) => (
                        <SelectItem key={writer.service_key} value={writer.service_key}>
                          {writer.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <Button
                  onClick={() =>
                    setEventFilters({
                      externalUserId: eventUserDraft.trim(),
                      sourceService: eventServiceDraft,
                    })
                  }
                >
                  <Filter className="mr-2 size-4" />
                  Apply filters
                </Button>
                <Button variant="outline" onClick={() => void events.mutate()}>
                  <RefreshCw className="mr-2 size-4" />
                  Refresh
                </Button>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Observed</TableHead>
                      <TableHead>Service / Event</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Evidence</TableHead>
                      <TableHead>Payload</TableHead>
                      <TableHead>Processing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventRows.length ? (
                      eventRows.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="text-slate-600">
                            {formatDate(event.observed_at)}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-900">{event.source_service}</div>
                            <div className="max-w-56 truncate font-mono text-xs text-slate-500" title={event.source_event_id}>
                              {event.source_event_id}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-700">
                            {event.external_user_id}
                          </TableCell>
                          <TableCell>
                            <EvidenceList event={event} />
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-500" title={event.payload_hash}>
                            {shortHash(event.payload_hash)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {event.extraction_job_id ? (
                                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                                  Job linked
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pending job</Badge>
                              )}
                              {typeof event.processing_metadata.provider === "string" ? (
                                <Badge variant="outline">
                                  {event.processing_metadata.provider}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-slate-500">
                          No source events match the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <CardTitle>Claim ledger</CardTitle>
              <CardDescription>
                See the active claim MemoryOS believes, the competing revisions behind it,
                and the source evidence used to choose a winner.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 xl:flex-row xl:items-end">
                <label className="flex-1 space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    External user ID
                  </span>
                  <Input
                    placeholder="customer_001"
                    value={claimUserDraft}
                    onChange={(event) => setClaimUserDraft(event.target.value)}
                  />
                </label>
                <label className="min-w-44 space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Status
                  </span>
                  <Select value={claimStatusDraft} onValueChange={setClaimStatusDraft}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="disputed">Disputed</SelectItem>
                      <SelectItem value="superseded">Superseded</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label className="min-w-48 space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Category
                  </span>
                  <Select value={claimCategoryDraft} onValueChange={setClaimCategoryDraft}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {MEMORY_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <Button
                  onClick={() =>
                    setClaimFilters({
                      externalUserId: claimUserDraft.trim(),
                      status: claimStatusDraft,
                      category: claimCategoryDraft,
                    })
                  }
                >
                  <Filter className="mr-2 size-4" />
                  Apply filters
                </Button>
                <Button variant="outline" onClick={() => void claims.mutate()}>
                  <RefreshCw className="mr-2 size-4" />
                  Refresh
                </Button>
              </div>

              <div className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                Claims are normalized facts behind memories. A memory can be archived or
                disputed, but its source-backed claim revision stays inspectable.
              </div>

              <div className="space-y-3">
                {claimRows.length ? (
                  claimRows.map((claim) => <ClaimCard key={claim.id} claim={claim} />)
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-500">
                    No claims match the current filters. New claims appear as sourced memories are extracted.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <WriterDialog
        key={editingWriter?.id ?? (writerDialogOpen ? "create-open" : "create-closed")}
        open={writerDialogOpen}
        writer={editingWriter}
        apiKeys={activeKeys}
        busy={writerBusy}
        error={writerError}
        onOpenChange={(open) => {
          setWriterDialogOpen(open);
          if (!open) {
            setEditingWriter(null);
            setWriterError(null);
          }
        }}
        onSubmit={saveWriter}
      />
    </div>
  );
}
