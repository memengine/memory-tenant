"use client";

import { useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  CheckCircle,
  Copy,
  Info,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";

import { JobTracker } from "@/components/job-tracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

type TimeRangeValue = "all" | "7" | "30";
type ContextFormat = "bullets" | "json" | "xml";

type MemorySearchResult = {
  id: string;
  content: string;
  category: string;
  importance_score: number;
  relevance_score?: number | null;
  context_snippet?: string | null;
};

type RetrieveResponse = {
  data?: MemorySearchResult[];
  system_prompt_addition?: string;
  context_token_count?: number;
  clarification_question?: string | null;
  cached?: boolean;
};

type AddResponse = {
  job_id?: string | null;
  status?: string;
  blocked_reason?: string | null;
  budget_remaining_pct?: number | null;
  nothing_to_extract?: boolean;
};

const TIME_RANGE_OPTIONS: Array<{ label: string; value: TimeRangeValue }> = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
];

function getPromptDisplay(value: string, format: ContextFormat): string {
  if (format !== "json" || !value.trim()) {
    return value;
  }
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function unwrapRetrieve(payload: RetrieveResponse | { data?: RetrieveResponse }) {
  const maybeEnvelope = payload as { data?: RetrieveResponse };
  if (
    maybeEnvelope.data &&
    !Array.isArray(maybeEnvelope.data) &&
    typeof maybeEnvelope.data === "object"
  ) {
    return maybeEnvelope.data;
  }
  return payload as RetrieveResponse;
}

const primaryButtonClassName =
  "bg-sky-700 text-white shadow-sm hover:bg-sky-800 disabled:bg-slate-300 disabled:text-slate-500";
const CONTEXT_MAX_TOKENS = 500;

function AddResultExplainer({ result }: { result: AddResponse | null }) {
  if (!result) {
    return null;
  }

  const wasStored = result.status === "queued" && !result.nothing_to_extract;
  const blocked = result.status === "blocked";

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="space-y-3 pt-5">
        {wasStored ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle className="size-4" />
              Memory will be stored
            </div>
            <p className="mt-1 text-emerald-800/80">
              The request queued successfully. Track the job below until
              extraction completes.
            </p>
          </div>
        ) : null}

        {result.nothing_to_extract ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <div className="flex items-center gap-2 font-semibold">
              <Info className="size-4" />
              Nothing to extract
            </div>
            <p className="mt-1 text-amber-900/80">
              This conversation had no storable facts. Try a more informative
              message.
            </p>
          </div>
        ) : null}

        {blocked ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            <div className="flex items-center gap-2 font-semibold">
              <XCircle className="size-4" />
              Blocked by quality gate
            </div>
            <p className="mt-1 text-rose-800/80">
              {result.blocked_reason ?? "No blocked reason was returned."}
            </p>
          </div>
        ) : null}

        <pre className="max-h-52 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
          {JSON.stringify(result, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

export default function PlaygroundPage() {
  const { isLoaded, getToken } = useAuth();
  const [externalUserId, setExternalUserId] = useState("playground-user");
  const [memoryText, setMemoryText] = useState(
    "Please remember that I prefer concise technical answers with Python examples.",
  );
  const [query, setQuery] = useState("How should I answer this user?");
  const [timeRange, setTimeRange] = useState<TimeRangeValue>("all");
  const [format, setFormat] = useState<ContextFormat>("bullets");
  const [addResult, setAddResult] = useState<AddResponse | null>(null);
  const [retrieveResult, setRetrieveResult] = useState<RetrieveResponse | null>(
    null,
  );
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [submittingRetrieve, setSubmittingRetrieve] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [questionCopyLabel, setQuestionCopyLabel] = useState("Copy question");
  const retrieveRefreshTimer = useRef<number | null>(null);

  const promptAddition = useMemo(
    () =>
      getPromptDisplay(
        retrieveResult?.system_prompt_addition ?? "",
        format,
      ),
    [format, retrieveResult?.system_prompt_addition],
  );

  async function apiRequest<T>(path: string, body: Record<string, unknown>) {
    if (!API_BASE) {
      throw new Error("NEXT_PUBLIC_API_BASE is not configured.");
    }
    const token = await getToken();
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const payload = (await response.json()) as {
          error?: string;
          detail?: string;
        };
        message = payload.error ?? payload.detail ?? message;
      } catch {
        // Keep the default message.
      }
      throw new Error(message);
    }

    return (await response.json()) as T;
  }

  async function handleAdd() {
    setSubmittingAdd(true);
    setError(null);
    try {
      const result = await apiRequest<AddResponse>("/v1/memories/add", {
        external_user_id: externalUserId,
        messages: [{ role: "user", content: memoryText }],
        metadata: { source: "tenant-dashboard-playground" },
      });
      setAddResult(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add memory.");
    } finally {
      setSubmittingAdd(false);
    }
  }

  function handleExternalUserIdChange(value: string) {
    setExternalUserId(value);
    if (!retrieveResult || !value || !query || !isLoaded) {
      return;
    }

    if (retrieveRefreshTimer.current) {
      window.clearTimeout(retrieveRefreshTimer.current);
    }
    retrieveRefreshTimer.current = window.setTimeout(() => {
      void handleRetrieve(value);
    }, 350);
  }

  async function handleRetrieve(userId = externalUserId) {
    setSubmittingRetrieve(true);
    setError(null);
    try {
      const result = unwrapRetrieve(
        await apiRequest<RetrieveResponse>("/v1/memories/retrieve", {
          external_user_id: userId,
          query,
          limit: 5,
          format,
          context_max_tokens: CONTEXT_MAX_TOKENS,
          ...(timeRange !== "all"
            ? { time_filter_days: Number(timeRange) }
            : {}),
        }),
      );
      setRetrieveResult(result);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to retrieve memories.",
      );
    } finally {
      setSubmittingRetrieve(false);
    }
  }

  async function copyPromptAddition() {
    await navigator.clipboard.writeText(promptAddition);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy"), 1400);
  }

  async function copyClarificationQuestion() {
    const question = retrieveResult?.clarification_question;
    if (!question) {
      return;
    }
    await navigator.clipboard.writeText(question);
    setQuestionCopyLabel("Copied");
    window.setTimeout(() => setQuestionCopyLabel("Copy question"), 1400);
  }

  return (
    <div className="flex flex-col gap-6 pt-14 md:pt-0">
      <div className="overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-blue-100 p-6 shadow-sm">
        <div className="max-w-4xl space-y-3">
          <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
            Playground
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Test real extraction and retrieval
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Store a memory, track the extraction job, retrieve relevant memories,
            and inspect the ContextBuilder system prompt addition before wiring
            it into your app.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card className="overflow-hidden border-sky-100 shadow-sm">
            <CardHeader className="border-b border-sky-100 bg-sky-50/70">
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-sky-700 text-white">
                  <Send className="size-4" />
                </span>
                Store a memory
              </CardTitle>
              <CardDescription className="text-slate-600">
                Queues a real extraction job through /v1/memories/add.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">
                  External user ID
                </label>
                <Input
                  value={externalUserId}
                  onChange={(event) =>
                    handleExternalUserIdChange(event.target.value)
                  }
                  placeholder="user_123"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">
                  Message to remember
                </label>
                <textarea
                  className="min-h-36 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none ring-sky-200 transition focus:ring-4"
                  value={memoryText}
                  onChange={(event) => setMemoryText(event.target.value)}
                />
              </div>
              <Button
                className={`w-full ${primaryButtonClassName}`}
                onClick={() => void handleAdd()}
                disabled={!isLoaded || submittingAdd || !externalUserId || !memoryText}
              >
                {submittingAdd ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Send className="mr-2 size-4" />
                )}
                Store Memory
              </Button>
            </CardContent>
          </Card>

          <JobTracker jobId={addResult?.job_id ?? null} getToken={getToken} />
          <AddResultExplainer result={addResult} />
        </div>

        <Card className="overflow-hidden border-sky-100 shadow-sm">
          <CardHeader className="border-b border-sky-100 bg-sky-50/70">
            <CardTitle className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-sky-700 text-white">
                <Sparkles className="size-4" />
              </span>
              Retrieve context
            </CardTitle>
            <CardDescription className="text-slate-600">
              Calls /v1/memories/retrieve with ContextBuilder options.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900">
                External user ID
              </label>
              <Input
                value={externalUserId}
                onChange={(event) =>
                  handleExternalUserIdChange(event.target.value)
                }
                placeholder="user_123"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">
                  Time range
                </label>
                <Select
                  value={timeRange}
                  onValueChange={(value) => setTimeRange(value as TimeRangeValue)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_RANGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">
                  Context format
                </label>
                <div className="flex rounded-2xl border border-slate-200 p-1">
                  {(["bullets", "json", "xml"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold capitalize transition ${
                        format === option
                          ? "bg-sky-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                      onClick={() => setFormat(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900">
                Query
              </label>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What does this user prefer?"
              />
            </div>

            <Button
              className={`w-full ${primaryButtonClassName}`}
              onClick={() => void handleRetrieve()}
              disabled={!isLoaded || submittingRetrieve || !externalUserId || !query}
            >
              {submittingRetrieve ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              Retrieve Memories
            </Button>

            {(retrieveResult?.data ?? []).length ? (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Retrieved memories
                </div>
                {retrieveResult?.data?.map((memory) => (
                  <div
                    key={memory.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
                        {memory.category}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        importance {memory.importance_score.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {memory.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    System Prompt Addition
                  </h2>
                  <p className="text-xs text-slate-500">
                    Paste this before your system prompt:
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copyPromptAddition()}
                  disabled={!promptAddition}
                >
                  <Copy className="mr-2 size-4" />
                  {copyLabel}
                </Button>
              </div>
              {promptAddition ? (
                <>
                  <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-slate-100 shadow-inner">
                    {promptAddition}
                  </pre>
                  <p className="text-xs text-slate-500">
                    {retrieveResult?.context_token_count ?? 0} /{" "}
                    {CONTEXT_MAX_TOKENS} tokens used
                  </p>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-5 text-sm text-slate-500">
                  No memories retrieved - system prompt addition is empty
                </div>
              )}
            </section>

            {retrieveResult?.clarification_question ? (
              <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <MessageCircle className="size-5" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">
                        Suggested clarification for this user:
                      </div>
                      <p className="text-base font-medium italic leading-7">
                        {retrieveResult.clarification_question}
                      </p>
                      <p className="text-sm text-amber-900/75">
                        Include this naturally in your AI&apos;s next response
                        to resolve a memory conflict for this user.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-amber-200 bg-white"
                    onClick={() => void copyClarificationQuestion()}
                  >
                    <Copy className="mr-2 size-4" />
                    {questionCopyLabel}
                  </Button>
                </div>
                <p className="border-t border-amber-200 pt-3 text-xs text-amber-900/70">
                  This question will disappear after the user&apos;s next
                  session - MemoryOS tracks whether it was addressed.
                </p>
              </section>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
