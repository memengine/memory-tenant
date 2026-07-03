"use client";

import { useState } from "react";
import { Copy, ExternalLink, Lock, RotateCcw } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addMemories, displayApiError, getMemoryJob, retrieveMemories, type MemoryJobStatus, type MemoryRecord } from "@/lib/api";

type Screen =
  | "engine"
  | "initializing"
  | "mode"
  | "single-input"
  | "single-processing"
  | "single-result"
  | "conflict-agent-one"
  | "conflict-agent-two"
  | "conflict-run"
  | "conflict-processing"
  | "conflict-result"
  | "passport-agent"
  | "passport-processing"
  | "passport-memory"
  | "passport-consent"
  | "passport-complete";

type EngineKind = "general" | "domain" | null;
type ModeKind = "single" | "conflict" | "passport" | null;

type LiveRunResult = {
  userId: string;
  jobIds: string[];
  jobs: MemoryJobStatus[];
  memories: MemoryRecord[];
  prompt: string;
  summary: string;
  error?: string;
};

function makePlaygroundUserId(prefix: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : String(Date.now()).slice(-8);
  return `${prefix}_${random}`;
}

function isJobDone(job: MemoryJobStatus) {
  const status = job.status.toLowerCase();
  return ["completed", "complete", "processed", "success", "failed", "dead", "error"].includes(status);
}

function isJobFailed(job: MemoryJobStatus) {
  const status = job.status.toLowerCase();
  return ["failed", "dead", "error"].includes(status) || Boolean(job.error || job.error_summary);
}

function memoryRecordsToList(records: MemoryRecord[]) {
  return records.map((memory) => ({
    text: memory.content,
    score: `${Number(memory.importance_score ?? 0).toFixed(1)}`,
    tag: `${memory.category}${memory.provenance?.service ? ` via ${memory.provenance.service}` : ""}`,
  }));
}


type Tab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

const VIOLET = "#7C3AED";

const defaultSingleMemory =
  "User prefers concise technical answers, works mostly in Python, and is building an AI support product.";

const defaultAgentOne = {
  name: "Billing Agent",
  authority: "Source of truth for subscriptions",
  claim: "User is on Pro plan, $99/month.",
};

const defaultAgentTwo = {
  name: "Support Agent",
  authority: "Handles refunds and downgrades",
  claim: "User downgraded to Basic last week.",
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function SegmentedSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center text-center">
      <div className="relative size-40 animate-spin rounded-full">
        {Array.from({ length: 12 }).map((_, index) => (
          <span
            key={index}
            className="absolute left-1/2 top-1/2 h-8 w-3 origin-[50%_72px] rounded-full"
            style={{
              backgroundColor: VIOLET,
              opacity: 0.25 + index * 0.055,
              transform: `translate(-50%, -72px) rotate(${index * 30}deg)`,
            }}
          />
        ))}
      </div>
      <h1 className="mt-10 text-[2.5rem] font-semibold leading-tight text-white">{label}</h1>
      <p className="mt-4 max-w-xl text-2xl leading-9 text-zinc-400">
        MemoryOS is preparing the memory pipeline, source checks, and retrieval context.
      </p>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-8 top-8 z-10 text-xl font-medium text-white transition hover:text-violet-300"
    >
      ← Back
    </button>
  );
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack?: () => void }) {
  return (
    <main className="relative -m-6 min-h-[calc(100vh-2rem)] bg-black px-6 py-16 text-white md:-m-8 md:px-10">
      {onBack ? <BackButton onClick={onBack} /> : null}
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col items-center justify-center transition-opacity duration-300">
        {children}
      </div>
    </main>
  );
}

function BigOption({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8 text-left transition duration-300 hover:-translate-y-1 hover:border-violet-500 hover:bg-zinc-900"
    >
      <h2 className="text-[2.5rem] font-semibold leading-tight text-white">{title}</h2>
      <p className="mt-3 text-2xl leading-9 text-zinc-400">{subtitle}</p>
    </button>
  );
}

function StepTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-10 text-center">
      {eyebrow ? <p className="mb-4 text-lg font-semibold uppercase tracking-[0.28em] text-violet-400">{eyebrow}</p> : null}
      <h1 className="text-[2.5rem] font-semibold leading-tight text-white">{title}</h1>
      {subtitle ? <p className="mt-4 max-w-3xl text-2xl leading-9 text-zinc-400">{subtitle}</p> : null}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-16 rounded-2xl px-8 text-xl font-semibold text-white hover:opacity-90 disabled:opacity-40"
      style={{ backgroundColor: VIOLET }}
    >
      {children}
    </Button>
  );
}

function Tabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const activeTab = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <div className="w-full rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-5 flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={classNames(
              "rounded-full border px-5 py-3 text-lg font-semibold transition",
              active === tab.id ? "border-violet-500 bg-violet-600 text-white" : "border-zinc-800 bg-black text-zinc-300 hover:border-violet-500",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-80 rounded-[1.5rem] border border-zinc-800 bg-black p-6 text-2xl leading-9 text-zinc-200">
        {activeTab?.content}
      </div>
    </div>
  );
}

function MemoryList({ items }: { items: Array<{ text: string; score: string; tag?: string }> }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.text} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-2xl font-semibold text-white">{item.text}</p>
            <span className="rounded-full bg-violet-600 px-4 py-2 text-base font-semibold text-white">{item.score}</span>
          </div>
          {item.tag ? <p className="mt-3 text-xl text-zinc-400">{item.tag}</p> : null}
        </div>
      ))}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return <pre className="overflow-auto rounded-2xl bg-zinc-950 p-5 text-lg leading-8 text-violet-200">{code}</pre>;
}
function JobSummary({ jobs }: { jobs: MemoryJobStatus[] }) {
  if (!jobs.length) {
    return <p>No extraction job was created. The quality gate may have blocked or skipped this turn.</p>;
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <div key={job.job_id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold text-white">{job.job_id}</p>
            <span className="rounded-full border border-violet-500 px-4 py-2 text-base font-semibold text-violet-200">
              {job.status}
            </span>
          </div>
          <p className="mt-3 text-xl text-zinc-400">
            stored {job.memories_created ?? job.memories_extracted ?? 0} · buffered {job.pending_candidates_buffered ?? 0} · attempts {job.attempts ?? 0}
          </p>
          {job.error_summary || job.error ? <p className="mt-3 text-xl text-red-300">{job.error_summary ?? job.error}</p> : null}
        </div>
      ))}
    </div>
  );
}

function ResultSummary({ result }: { result: LiveRunResult | null }) {
  if (!result) {
    return <p>Waiting for live backend result...</p>;
  }

  return (
    <div className="space-y-4">
      <p>{result.summary}</p>
      <p className="text-xl text-zinc-400">External user ID: {result.userId}</p>
      {result.error ? <p className="rounded-2xl border border-red-900 bg-red-950/40 p-5 text-red-200">{result.error}</p> : null}
    </div>
  );
}
function PassportProductionNote() {
  return (
    <div className="mb-6 w-full max-w-4xl rounded-[1.5rem] border border-sky-500 bg-sky-950/40 p-6 text-left shadow-[0_0_40px_rgba(14,165,233,0.16)]">
      <p className="text-lg font-semibold uppercase tracking-[0.24em] text-sky-300">
        Real Memory Passport setup
      </p>
      <p className="mt-4 text-2xl leading-9 text-white">
        This screen is a guided preview. For the real Passport experience, create a Passport agent in the tenant dashboard, copy the agent ID, then send users through a consent URL or secure-link connector.
      </p>
      <div className="mt-5 grid gap-3 text-xl leading-8 text-sky-100 md:grid-cols-3">
        <div className="rounded-2xl border border-sky-800 bg-black/30 p-4">1. Create Passport agent</div>
        <div className="rounded-2xl border border-sky-800 bg-black/30 p-4">2. Open consent or connector link</div>
        <div className="rounded-2xl border border-sky-800 bg-black/30 p-4">3. User approves scope and can revoke later</div>
      </div>
      <p className="mt-5 text-lg text-sky-200">
        Go to Tenant Dashboard → Memory Passport to create the live agent identity and test with a real grant.
      </p>
    </div>
  );
}

export default function PlaygroundPage() {
  const { getToken } = useAuth();
  const [screen, setScreen] = useState<Screen>("engine");
  const [previousScreen, setPreviousScreen] = useState<Screen>("engine");
  const [engine, setEngine] = useState<EngineKind>(null);
  const [singleMemory, setSingleMemory] = useState(defaultSingleMemory);
  const [agentOne, setAgentOne] = useState(defaultAgentOne);
  const [agentTwo, setAgentTwo] = useState(defaultAgentTwo);
  const [passportAgent, setPassportAgent] = useState("Python Coding Assistant");
  const [copyLabel, setCopyLabel] = useState("Share Results");
  const [singleResult, setSingleResult] = useState<LiveRunResult | null>(null);
  const [conflictResult, setConflictResult] = useState<LiveRunResult | null>(null);

  async function initialize(nextEngine: Exclude<EngineKind, null>) {
    setEngine(nextEngine);
    setPreviousScreen("engine");
    setScreen("initializing");
    await sleep(1500);
    setScreen("mode");
  }

  async function runProcessing(next: Screen, loading: Screen, ms = 1500) {
    setPreviousScreen(screen);
    setScreen(loading);
    await sleep(ms);
    setScreen(next);
  }
  async function pollJob(jobId: string): Promise<MemoryJobStatus> {
    let latest: MemoryJobStatus | null = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      latest = await getMemoryJob(getToken, jobId);
      if (isJobDone(latest)) {
        return latest;
      }
      await sleep(2_000);
    }

    return latest ?? { job_id: jobId, status: "processing" };
  }

  async function runSingleLive() {
    const userId = makePlaygroundUserId("playground_single");
    setPreviousScreen(screen);
    setSingleResult(null);
    setScreen("single-processing");

    try {
      const addResult = await addMemories(getToken, {
        external_user_id: userId,
        messages: [
          { role: "user", content: singleMemory },
          { role: "assistant", content: "I will remember the durable context that helps future sessions." },
        ],
        source: {
          service: "tenant-playground",
          event_id: `single-${userId}`,
          scope: { demo: "single-agent" },
        },
        metadata: { source: "tenant_playground" },
      });

      const jobs = addResult.job_id ? [await pollJob(addResult.job_id)] : [];
      const retrieved = await retrieveMemories(getToken, {
        external_user_id: userId,
        query: singleMemory,
        limit: 8,
        format: "bullets",
        context_max_tokens: 700,
      });
      const created = jobs.reduce((total, job) => total + (job.memories_created ?? job.memories_extracted ?? 0), 0);
      const buffered = jobs.reduce((total, job) => total + (job.pending_candidates_buffered ?? 0), 0);
      const failedJob = jobs.find(isJobFailed);

      setSingleResult({
        userId,
        jobIds: addResult.job_id ? [addResult.job_id] : [],
        jobs,
        memories: retrieved.data,
        prompt: retrieved.system_prompt_addition,
        summary: failedJob
          ? `Extraction job finished with an error: ${failedJob.error_summary ?? failedJob.error ?? "unknown error"}.`
          : `${created} memories stored${buffered ? `, ${buffered} weak signals buffered` : ""}. Retrieval returned ${retrieved.data.length} records.`,
      });
    } catch (caught) {
      setSingleResult({
        userId,
        jobIds: [],
        jobs: [],
        memories: [],
        prompt: "",
        summary: "Live backend call failed.",
        error: displayApiError(caught) ?? "Unable to run the live playground right now.",
      });
    } finally {
      setScreen("single-result");
    }
  }

  async function runConflictLive() {
    const userId = makePlaygroundUserId("playground_conflict");
    setPreviousScreen(screen);
    setConflictResult(null);
    setScreen("conflict-processing");

    try {
      const supportFirst = await addMemories(getToken, {
        external_user_id: userId,
        messages: [
          { role: "user", content: `Support note from ${agentTwo.name}: ${agentTwo.claim}` },
          { role: "assistant", content: `${agentTwo.name} reported: ${agentTwo.claim}` },
        ],
        source: {
          service: agentTwo.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "support-agent",
          event_id: `conflict-support-${userId}`,
          scope: { authority: agentTwo.authority, demo: "multi-service-conflict" },
        },
        metadata: { source: "tenant_playground", authority: agentTwo.authority },
      });

      const billingSecond = await addMemories(getToken, {
        external_user_id: userId,
        messages: [
          { role: "user", content: `Billing note from ${agentOne.name}: ${agentOne.claim}` },
          { role: "assistant", content: `${agentOne.name} reported: ${agentOne.claim}` },
        ],
        source: {
          service: agentOne.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "billing-agent",
          event_id: `conflict-billing-${userId}`,
          scope: { authority: agentOne.authority, demo: "multi-service-conflict" },
        },
        metadata: { source: "tenant_playground", authority: agentOne.authority },
      });

      const jobIds = [supportFirst.job_id, billingSecond.job_id].filter((value): value is string => Boolean(value));
      const jobs = [] as MemoryJobStatus[];
      for (const jobId of jobIds) {
        jobs.push(await pollJob(jobId));
      }

      const retrieved = await retrieveMemories(getToken, {
        external_user_id: userId,
        query: "What is the current subscription plan or account status for this user?",
        limit: 10,
        format: "bullets",
        context_max_tokens: 900,
      });
      const created = jobs.reduce((total, job) => total + (job.memories_created ?? job.memories_extracted ?? 0), 0);
      const buffered = jobs.reduce((total, job) => total + (job.pending_candidates_buffered ?? 0), 0);

      setConflictResult({
        userId,
        jobIds,
        jobs,
        memories: retrieved.data,
        prompt: retrieved.system_prompt_addition,
        summary: `${created} memories stored${buffered ? `, ${buffered} weak signals buffered` : ""}. Retrieval returned ${retrieved.data.length} records from the live backend.`,
      });
    } catch (caught) {
      setConflictResult({
        userId,
        jobIds: [],
        jobs: [],
        memories: [],
        prompt: "",
        summary: "Live backend call failed.",
        error: displayApiError(caught) ?? "Unable to run the live conflict demo right now.",
      });
    } finally {
      setScreen("conflict-result");
    }
  }

  function chooseMode(nextMode: Exclude<ModeKind, null>) {
    if (nextMode === "single") setScreen("single-input");
    if (nextMode === "conflict") setScreen("conflict-agent-one");
    if (nextMode === "passport") setScreen("passport-agent");
  }

  function back() {
    if (screen === "mode") setScreen("engine");
    else if (screen === "single-input") setScreen("mode");
    else if (screen === "single-result") setScreen("mode");
    else if (screen === "conflict-agent-one") setScreen("mode");
    else if (screen === "conflict-agent-two") setScreen("conflict-agent-one");
    else if (screen === "conflict-run") setScreen("conflict-agent-two");
    else if (screen === "conflict-result") setScreen("mode");
    else if (screen === "passport-agent") setScreen("mode");
    else if (screen === "passport-memory") setScreen("passport-agent");
    else if (screen === "passport-consent") setScreen("passport-memory");
    else if (screen === "passport-complete") setScreen("passport-memory");
    else setScreen(previousScreen);
  }

  function useExampleConflict() {
    setAgentOne(defaultAgentOne);
    setAgentTwo(defaultAgentTwo);
  }

  async function openConsentPortal() {
    setScreen("passport-consent");
    const baseUrl = process.env.NEXT_PUBLIC_CONSENT_BASE_URL;
    if (baseUrl) {
      window.open(baseUrl, "_blank", "noopener,noreferrer");
    }
    await sleep(4000);
    setScreen("passport-complete");
  }

  async function shareResults() {
    await navigator.clipboard.writeText("MemoryOS Playground complete: extraction, conflict governance, and Memory Passport explored.");
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Share Results"), 1400);
  }

  function restart() {
    setEngine(null);
    setScreen("engine");
    setPreviousScreen("engine");
    setSingleMemory(defaultSingleMemory);
    setAgentOne(defaultAgentOne);
    setAgentTwo(defaultAgentTwo);
    setPassportAgent("Python Coding Assistant");
  }

  const finalBar = screen.endsWith("result") || screen === "passport-complete";

  if (screen === "engine") {
    return (
      <Shell>
        <StepTitle title="What kind of memory engine do you want to explore?" />
        <div className="grid w-full max-w-3xl gap-5">
          <BigOption title="General Engine" subtitle="Works across any agent or use case" onClick={() => void initialize("general")} />
          <BigOption title="Domain-Specific Engine" subtitle="Optimized for EdTech, Customer Support, or Healthcare" onClick={() => void initialize("domain")} />
        </div>
      </Shell>
    );
  }

  if (screen === "initializing") {
    return (
      <Shell onBack={back}>
        <SegmentedSpinner label="Initializing MemoryOS engine..." />
      </Shell>
    );
  }

  if (screen === "mode") {
    return (
      <Shell onBack={back}>
        <StepTitle title="Choose your memory mode." subtitle={engine === "domain" ? "Domain-specific demos still use the same governance layer underneath." : undefined} />
        <div className="grid w-full max-w-4xl gap-5">
          <BigOption title="What does MemoryOS remember?" subtitle="Single-agent memory extraction and scoring" onClick={() => chooseMode("single")} />
          <BigOption title="Multi-service agent conflict" subtitle="Two agents, one fact, resolved by authority" onClick={() => chooseMode("conflict")} />
          <BigOption title="User-approved cross-agent memory" subtitle="The Memory Passport: consent, scope, and revocation" onClick={() => chooseMode("passport")} />
        </div>
      </Shell>
    );
  }

  if (screen === "single-input") {
    return (
      <Shell onBack={back}>
        <StepTitle title="What should your agent remember?" subtitle="Write one realistic user message. MemoryOS will extract durable memories from it." />
        <div className="w-full max-w-4xl space-y-5">
          <textarea
            className="min-h-64 w-full rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6 text-2xl leading-9 text-white outline-none ring-violet-500/20 transition focus:ring-4"
            value={singleMemory}
            onChange={(event) => setSingleMemory(event.target.value)}
          />
          <PrimaryButton onClick={() => void runSingleLive()} disabled={!singleMemory.trim()}>
            Store Memory
          </PrimaryButton>
        </div>
      </Shell>
    );
  }

  if (screen === "single-processing") {
    return (
      <Shell onBack={back}>
        <SegmentedSpinner label="Extracting & scoring..." />
      </Shell>
    );
  }

  if (screen === "single-result") {
    const memoryItems = singleResult?.memories.length ? memoryRecordsToList(singleResult.memories) : [];
    return (
      <Shell onBack={back}>
        <StepTitle eyebrow="Single-agent memory" title="Live extraction result" />
        <Tabs
          tabs={[
            { id: "summary", label: "Summary", content: <ResultSummary result={singleResult} /> },
            { id: "memories", label: "Extracted Memories", content: memoryItems.length ? <MemoryList items={memoryItems} /> : <p>No retrievable memories yet. If a weak signal was buffered, repeat the same fact to reinforce it.</p> },
            { id: "jobs", label: "Job Status", content: <JobSummary jobs={singleResult?.jobs ?? []} /> },
            { id: "prompt", label: "Prompt Context", content: <CodeBlock code={singleResult?.prompt || "No prompt context returned yet."} /> },
            { id: "code", label: "Integration Code", content: <CodeBlock code={`from memoryos import Memory\n\nmem = Memory(api_key="mem_live_xxx")\n\nmem.add(\n    external_user_id="${singleResult?.userId ?? "user_123"}",\n    messages=[{"role": "user", "content": "${singleMemory.replaceAll('"', '\\"')}"}],\n)\n\ncontext = mem.retrieve(\n    external_user_id="${singleResult?.userId ?? "user_123"}",\n    query="what should the agent remember?",\n)`} /> },
          ]}
        />
        <CompletionBar restart={restart} shareResults={() => void shareResults()} copyLabel={copyLabel} show={finalBar} />
      </Shell>
    );
  }

  if (screen === "conflict-agent-one") {
    return (
      <Shell onBack={back}>
        <StepTitle eyebrow="First agent" title="What does the first agent know?" />
        <AgentForm agent={agentOne} setAgent={setAgentOne} button="Next" onNext={() => setScreen("conflict-agent-two")} />
      </Shell>
    );
  }

  if (screen === "conflict-agent-two") {
    return (
      <Shell onBack={back}>
        <StepTitle eyebrow="Second agent" title="What does the second agent say?" subtitle="Try something that contradicts Agent 1." />
        <AgentForm agent={agentTwo} setAgent={setAgentTwo} button="Next" onNext={() => setScreen("conflict-run")} extra={<Button variant="outline" className="h-14 border-zinc-700 bg-black text-lg text-white hover:bg-zinc-900" onClick={useExampleConflict}>Use example conflict</Button>} />
      </Shell>
    );
  }

  if (screen === "conflict-run") {
    return (
      <Shell onBack={back}>
        <StepTitle title="Run MemoryOS" subtitle="MemoryOS will resolve the conflict using source authority." />
        <div className="grid w-full max-w-4xl gap-5 md:grid-cols-2">
          <ConflictPreview title={agentOne.name} authority={agentOne.authority} claim={agentOne.claim} />
          <ConflictPreview title={agentTwo.name} authority={agentTwo.authority} claim={agentTwo.claim} />
        </div>
        <div className="mt-10">
          <PrimaryButton onClick={() => void runConflictLive()}>Run MemoryOS</PrimaryButton>
        </div>
      </Shell>
    );
  }

  if (screen === "conflict-processing") {
    return (
      <Shell onBack={back}>
        <SegmentedSpinner label="Resolving conflict..." />
      </Shell>
    );
  }

  if (screen === "conflict-result") {
    const memoryItems = conflictResult?.memories.length ? memoryRecordsToList(conflictResult.memories) : [];
    const sourceLines = conflictResult?.memories.map((memory) => `${memory.content}\n  source: ${memory.provenance?.service ?? "unknown"}\n  event: ${memory.provenance?.event_id ?? memory.source_event_id ?? "unknown"}`).join("\n\n") ?? "No live source records returned.";
    return (
      <Shell onBack={back}>
        <StepTitle eyebrow="Multi-service memory" title="Live conflict retrieval result" />
        <Tabs
          tabs={[
            { id: "summary", label: "Summary", content: <ResultSummary result={conflictResult} /> },
            { id: "memories", label: "Extracted Memories", content: memoryItems.length ? <MemoryList items={memoryItems} /> : <p>No retrievable memories yet. Check job status to see whether the facts were buffered, skipped, or still processing.</p> },
            { id: "jobs", label: "Job Status", content: <JobSummary jobs={conflictResult?.jobs ?? []} /> },
            { id: "decision", label: "Retrieval Decision", content: <p>{conflictResult?.memories[0] ? `Top live retrieval result: ${conflictResult.memories[0].content}` : "No winning context was returned yet. Check whether extraction stored, buffered, or skipped the submitted claims."}</p> },
            { id: "sources", label: "Sources", content: <CodeBlock code={sourceLines} /> },
            { id: "prompt", label: "Prompt Context", content: <CodeBlock code={conflictResult?.prompt || "No prompt context returned yet."} /> },
            { id: "code", label: "Integration Code", content: <CodeBlock code={`from memoryos import Memory\n\nmem = Memory(api_key="mem_live_xxx")\n\nmem.add(\n    external_user_id="${conflictResult?.userId ?? "cust_123"}",\n    messages=[...],\n    source={"service": "billing-agent"},\n)\nmem.add(\n    external_user_id="${conflictResult?.userId ?? "cust_123"}",\n    messages=[...],\n    source={"service": "support-agent"},\n)\n\ncontext = mem.retrieve(\n    external_user_id="${conflictResult?.userId ?? "cust_123"}",\n    query="current subscription plan",\n)`} /> },
          ]}
        />
        <CompletionBar restart={restart} shareResults={() => void shareResults()} copyLabel={copyLabel} show={finalBar} />
      </Shell>
    );
  }

  if (screen === "passport-agent") {
    return (
      <Shell onBack={back}>
        <StepTitle title="Name your agent" subtitle="MemoryOS will load a sample Passport profile for this agent." />
        <div className="w-full max-w-3xl space-y-5">
          <Input className="h-16 border-zinc-800 bg-zinc-950 px-5 text-2xl text-white" value={passportAgent} onChange={(event) => setPassportAgent(event.target.value)} />
          <PrimaryButton onClick={() => void runProcessing("passport-memory", "passport-processing")} disabled={!passportAgent.trim()}>Load Memories</PrimaryButton>
        </div>
      </Shell>
    );
  }

  if (screen === "passport-processing") {
    return (
      <Shell onBack={back}>
        <SegmentedSpinner label="Retrieving agent memory..." />
      </Shell>
    );
  }

  if (screen === "passport-memory") {
    return (
      <Shell onBack={back}>
        <StepTitle eyebrow="Memory Passport" title={`${passportAgent} can request user-approved memory.`} subtitle="Session managed internally by MemoryOS. Agent IDs and keys are not shown in the playground." />
        <PassportProductionNote />
        <PassportMemory />
        <div className="mt-8">
          <PrimaryButton onClick={() => void openConsentPortal()}>
            <Lock className="mr-3 size-6" />
            Give Consent
          </PrimaryButton>
        </div>
      </Shell>
    );
  }

  if (screen === "passport-consent") {
    return (
      <Shell onBack={back}>
        <StepTitle title="Consent portal opened." subtitle="Return here when done. MemoryOS is checking consent status every 2 seconds." />
        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8 text-center">
          <ExternalLink className="mx-auto size-14 text-violet-400" />
          <p className="mt-5 text-2xl leading-9 text-zinc-300">Waiting for consent confirmation...</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onBack={back}>
      <StepTitle eyebrow="Consent complete" title="Cross-agent access: LIMITED" subtitle="The user approved goals, preferences, and facts. Relationships and expertise remain restricted." />
      <Tabs
        tabs={[
          { id: "approved", label: "Approved", content: <MemoryList items={[{ text: "Goals", score: "granted" }, { text: "Preferences", score: "granted" }, { text: "Facts", score: "granted" }]} /> },
          { id: "restricted", label: "Restricted", content: <MemoryList items={[{ text: "Relationships", score: "blocked" }, { text: "Expertise", score: "blocked" }]} /> },
          { id: "revoked", label: "Revocation", content: <p>The user can revoke this grant anytime from the MemoryOS Permission Center.</p> },
        ]}
      />
      <CompletionBar restart={restart} shareResults={() => void shareResults()} copyLabel={copyLabel} show />
    </Shell>
  );
}

function AgentForm({ agent, setAgent, button, onNext, extra }: { agent: typeof defaultAgentOne; setAgent: (agent: typeof defaultAgentOne) => void; button: string; onNext: () => void; extra?: React.ReactNode }) {
  return (
    <div className="w-full max-w-4xl space-y-5">
      <Input className="h-16 border-zinc-800 bg-zinc-950 px-5 text-2xl text-white" value={agent.name} onChange={(event) => setAgent({ ...agent, name: event.target.value })} placeholder="Agent name" />
      <Input className="h-16 border-zinc-800 bg-zinc-950 px-5 text-2xl text-white" value={agent.authority} onChange={(event) => setAgent({ ...agent, authority: event.target.value })} placeholder="Authority" />
      <textarea className="min-h-44 w-full rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6 text-2xl leading-9 text-white outline-none ring-violet-500/20 transition focus:ring-4" value={agent.claim} onChange={(event) => setAgent({ ...agent, claim: event.target.value })} placeholder="What does this agent say?" />
      <div className="flex flex-wrap gap-4">
        <PrimaryButton onClick={onNext} disabled={!agent.name || !agent.authority || !agent.claim}>{button}</PrimaryButton>
        {extra}
      </div>
    </div>
  );
}

function ConflictPreview({ title, authority, claim }: { title: string; authority: string; claim: string }) {
  return (
    <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
      <h2 className="text-[2rem] font-semibold text-white">{title}</h2>
      <p className="mt-3 text-xl leading-8 text-violet-300">{authority}</p>
      <p className="mt-6 text-2xl leading-9 text-zinc-200">{claim}</p>
    </div>
  );
}

function PassportMemory() {
  const sections = [
    ["Goals", "Ship MemoryOS without losing governance quality."],
    ["Preferences", "Prefers direct technical explanations."],
    ["Facts", "Works mostly with Python and TypeScript."],
    ["History", "Previously connected a study assistant."],
  ];
  return (
    <div className="grid w-full max-w-4xl gap-4 md:grid-cols-2">
      {sections.map(([title, value]) => (
        <div key={title} className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-lg font-semibold uppercase tracking-[0.2em] text-violet-400">{title}</p>
          <p className="mt-4 text-2xl leading-9 text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

function CompletionBar({ restart, shareResults, copyLabel, show }: { restart: () => void; shareResults: () => void; copyLabel: string; show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center gap-4 rounded-full border border-zinc-800 bg-zinc-950/95 px-5 py-4 shadow-2xl shadow-black">
      <span className="text-xl font-semibold text-white">MemoryOS Playground complete.</span>
      <Button type="button" variant="outline" className="rounded-full border-zinc-700 bg-black text-white hover:bg-zinc-900" onClick={restart}>
        <RotateCcw className="mr-2 size-4" /> Restart Demo
      </Button>
      <Button type="button" className="rounded-full text-white" style={{ backgroundColor: VIOLET }} onClick={shareResults}>
        <Copy className="mr-2 size-4" /> {copyLabel}
      </Button>
    </div>
  );
}
