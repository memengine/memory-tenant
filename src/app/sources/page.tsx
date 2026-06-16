"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import {
  Activity,
  DatabaseZap,
  FileKey2,
  Filter,
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
  listServiceWriters,
  listSourceEvents,
  updateServiceWriter,
  type ApiKeyData,
  type AuthorityRules,
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
  if (event.evidence_refs.length === 0) {
    return <span className="text-slate-400">No references</span>;
  }
  return (
    <div className="flex max-w-xs flex-wrap gap-1.5">
      {event.evidence_refs.map((evidence, index) => (
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

  const writerRows = useMemo(() => writers.data ?? [], [writers.data]);
  const eventRows = useMemo(() => events.data ?? [], [events.data]);
  const activeKeys = apiKeys.data?.data ?? [];
  const errorMessage = displayApiError(writers.error ?? events.error ?? apiKeys.error);
  const metrics = useMemo(
    () => ({
      activeWriters: writerRows.filter((writer) => writer.is_active).length,
      boundWriters: writerRows.filter((writer) => writer.api_key_id).length,
      events: eventRows.length,
      services: new Set(eventRows.map((event) => event.source_service)).size,
    }),
    [eventRows, writerRows],
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
          title="Observed Services"
          value={metrics.services.toLocaleString("en-IN")}
          description="Distinct services represented in this event view"
          icon={DatabaseZap}
          loading={events.isLoading && !events.data}
          error={errorMessage}
          onRetry={() => void events.mutate()}
        />
      </section>

      <Tabs defaultValue="writers">
        <TabsList className="h-10">
          <TabsTrigger value="writers" className="px-4">Service writers</TabsTrigger>
          <TabsTrigger value="events" className="px-4">Source events</TabsTrigger>
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
