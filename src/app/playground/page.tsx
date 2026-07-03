"use client";

import { useMemo, useState } from "react";
import { Copy, ExternalLink, Lock, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

export default function PlaygroundPage() {
  const [screen, setScreen] = useState<Screen>("engine");
  const [previousScreen, setPreviousScreen] = useState<Screen>("engine");
  const [engine, setEngine] = useState<EngineKind>(null);
  const [singleMemory, setSingleMemory] = useState(defaultSingleMemory);
  const [agentOne, setAgentOne] = useState(defaultAgentOne);
  const [agentTwo, setAgentTwo] = useState(defaultAgentTwo);
  const [passportAgent, setPassportAgent] = useState("Python Coding Assistant");
  const [copyLabel, setCopyLabel] = useState("Share Results");

  const singleMemories = useMemo(
    () => [
      { text: "User prefers concise technical answers.", score: "9.1" },
      { text: "User mostly works in Python.", score: "8.4" },
      { text: "User is building an AI support product.", score: "8.0" },
    ],
    [],
  );

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
          <PrimaryButton onClick={() => void runProcessing("single-result", "single-processing")} disabled={!singleMemory.trim()}>
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
    return (
      <Shell onBack={back}>
        <StepTitle eyebrow="Single-agent memory" title="Your agent extracted 3 facts." />
        <Tabs
          tabs={[
            { id: "summary", label: "Summary", content: <p>Your agent now has durable context it can retrieve later instead of asking the user again.</p> },
            { id: "memories", label: "Extracted Memories", content: <MemoryList items={singleMemories} /> },
            { id: "prompt", label: "Prompt Context", content: <CodeBlock code={`What you know about this user:\n- User prefers concise technical answers.\n- User mostly works in Python.\n- User is building an AI support product.`} /> },
            { id: "code", label: "Integration Code", content: <CodeBlock code={`from memoryos import Memory\n\nmem = Memory(api_key="mem_live_xxx")\n\nmem.add(\n    external_user_id="user_123",\n    messages=[{"role": "user", "content": "${singleMemory.replaceAll('"', '\\"')}"}],\n)`} /> },
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
          <PrimaryButton onClick={() => void runProcessing("conflict-result", "conflict-processing")}>Run MemoryOS</PrimaryButton>
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
    const winner = agentOne.name || "Billing Agent";
    return (
      <Shell onBack={back}>
        <StepTitle eyebrow="Conflict detected" title={`Resolution: ${winner}'s fact is authoritative.`} />
        <Tabs
          tabs={[
            { id: "summary", label: "Summary", content: <p>MemoryOS surfaced both claims and applied the authority rule instead of silently trusting recency.</p> },
            { id: "memories", label: "Extracted Memories", content: <MemoryList items={[{ text: agentOne.claim, score: "winner", tag: agentOne.authority }, { text: agentTwo.claim, score: "conflict", tag: agentTwo.authority }]} /> },
            { id: "decision", label: "Conflict Decision", content: <p>{winner} won because it is marked as the source of truth for subscriptions. The losing claim is kept for audit/history, not deleted.</p> },
            { id: "sources", label: "Sources", content: <CodeBlock code={`run_id: demo-run-001\nagent_1: ${agentOne.name}\nauthority: ${agentOne.authority}\nagent_2: ${agentTwo.name}\nauthority: ${agentTwo.authority}`} /> },
            { id: "prompt", label: "Prompt Context", content: <CodeBlock code={`Use this subscription context:\n- Current plan: Pro plan, $99/month.\n- Source: ${agentOne.name}.\n- Note: ${agentTwo.name} reported a conflicting downgrade; verify before refunding.`} /> },
            { id: "code", label: "Integration Code", content: <CodeBlock code={`from memoryos import Memory\n\nmem = Memory(api_key="mem_live_xxx")\n\nmem.add(external_user_id="cust_123", messages=[...], source={"service": "billing"})\nmem.add(external_user_id="cust_123", messages=[...], source={"service": "support"})\n\ncontext = mem.retrieve("cust_123", query="current subscription plan")`} /> },
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
