"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Fingerprint,
  GitBranch,
  KeyRound,
  Link2,
  Loader2,
  LockKeyhole,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createPassportLinkToken,
  displayApiError,
  listGlobalAgents,
  type GlobalAgentData,
  type MemoryCategory,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const consentBaseUrl = process.env.NEXT_PUBLIC_CONSENT_BASE_URL?.replace(/\/$/, "") ?? "";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "https://api.memoryo.dev";

const categoryLabels: Record<MemoryCategory, string> = {
  preference: "Preferences",
  fact: "Facts",
  goal: "Goals",
  procedure: "Procedures",
  relationship: "Relationships",
  expertise: "Expertise",
};

const defaultCategories: MemoryCategory[] = ["preference", "fact", "goal"];

type StudioStep = "agent" | "consent" | "connector" | "source";

const studioSteps: Array<{ id: StudioStep; index: number; title: string; summary: string }> = [
  { id: "agent", index: 1, title: "Choose agent", summary: "Pick the public Passport identity users approve." },
  { id: "consent", index: 2, title: "Create consent link", summary: "Generate the permission URL for agent access." },
  { id: "connector", index: 3, title: "Secure-link connector", summary: "Create one-time links for signed-in users when OAuth is not ready." },
  { id: "source", index: 4, title: "Multi-service truth", summary: "Keep Billing, Support, CRM, or LMS memories separate and explainable." },
];

function buildConsentUrl(agent: GlobalAgentData | undefined, categories: MemoryCategory[], state: string, returnUrl: string) {
  if (!consentBaseUrl || !agent) return "";
  const params = new URLSearchParams({ agent_id: agent.id, categories: categories.join(","), state });
  if (returnUrl.trim()) params.set("redirect_uri", returnUrl.trim());
  return `${consentBaseUrl}/consent?${params.toString()}`;
}

function buildConnectorUrl(linkToken: string, agent: GlobalAgentData | undefined) {
  if (!consentBaseUrl || !agent || !linkToken) return "";
  const params = new URLSearchParams({ agent_id: agent.id, link_token: linkToken });
  return `${consentBaseUrl}/connect?${params.toString()}`;
}

function formatStudioError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (raw === "proxy_user_not_found") {
    return "No MemoryOS Passport is linked to this test user yet. In production, your app opens this after the user signs in, then MemoryOS lets them create or sign into their Passport.";
  }
  return displayApiError(error) ?? "Could not create connector link.";
}

function copyText(value: string) {
  if (!value) return Promise.resolve();
  return navigator.clipboard.writeText(value);
}

function CodeBlock({ code, title = "Production code" }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await copyText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <details className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-sm font-semibold text-slate-100">
        <span>{title}</span>
        <span className="text-xs font-medium text-cyan-200 group-open:hidden">Show code</span>
        <span className="hidden text-xs font-medium text-cyan-200 group-open:inline">Hide code</span>
      </summary>
      <div className="flex items-center justify-end border-b border-white/10 px-4 py-2">
        <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-slate-200 transition hover:bg-white/10">
          <Copy className="size-3.5" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[320px] overflow-auto p-4 text-xs leading-6 text-slate-100"><code>{code}</code></pre>
    </details>
  );
}

function UrlBox({ value, fallback }: { value: string; fallback: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
      <div className="max-h-28 overflow-auto break-all">{value || fallback}</div>
    </div>
  );
}

function StepButton({ step, active, complete, onClick }: { step: (typeof studioSteps)[number]; active: boolean; complete: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[96px] items-start gap-3 rounded-2xl border p-4 text-left transition",
        active ? "border-cyan-300 bg-cyan-50 text-slate-950 shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:bg-cyan-50/40",
      )}
    >
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", active || complete ? "bg-cyan-500 text-slate-950" : "bg-slate-100 text-slate-500")}>
        {complete ? <CheckCircle2 className="size-4" /> : step.index}
      </span>
      <span>
        <span className="block font-semibold">{step.title}</span>
        <span className="mt-1 block text-sm leading-5 text-slate-500">{step.summary}</span>
      </span>
    </button>
  );
}

function AgentPicker({ agents, selectedAgentId, onSelect }: { agents: GlobalAgentData[]; selectedAgentId: string; onSelect: (id: string) => void }) {
  if (agents.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        Create a Passport agent first. Studio uses that agent identity to generate real consent and connector links.
        <div className="mt-3">
          <Button asChild size="sm" variant="outline"><Link href="/memory-passport">Open Memory Passport</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {agents.map((agent) => {
        const active = selectedAgentId === agent.id;
        return (
          <button
            key={agent.id}
            type="button"
            onClick={() => onSelect(agent.id)}
            className={cn("rounded-2xl border p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50/60", active ? "border-cyan-400 bg-cyan-50 shadow-sm" : "border-slate-200 bg-white")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-950">{agent.name}</div>
                <div className="mt-1 max-w-md truncate text-xs text-slate-500">{agent.id}</div>
              </div>
              <Badge className={agent.is_verified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{agent.is_verified ? "Verified" : "Review pending"}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(agent.default_categories_requested.length ? agent.default_categories_requested : defaultCategories).map((category) => (
                <span key={category} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">{categoryLabels[category]}</span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function StudioPage() {
  const { isLoaded, getToken } = useAuth();
  const [activeStep, setActiveStep] = useState<StudioStep>("agent");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<MemoryCategory[]>(defaultCategories);
  const [stateValue, setStateValue] = useState("connect_memory_user_123");
  const [returnUrl, setReturnUrl] = useState("https://yourapp.com/integrations/memoryos/callback");
  const [externalUserId, setExternalUserId] = useState("customer_123");
  const [linkToken, setLinkToken] = useState("");
  const [connectorError, setConnectorError] = useState<string | null>(null);
  const [creatingConnector, setCreatingConnector] = useState(false);

  const agentsQuery = useSWR(
    isLoaded ? "studio-global-agents" : null,
    () => listGlobalAgents(getToken),
    { refreshInterval: 60000 },
  );
  const agents = agentsQuery.data ?? [];
  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === selectedAgentId) ?? agents[0], [agents, selectedAgentId]);
  const activeIndex = studioSteps.find((step) => step.id === activeStep)?.index ?? 1;
  const consentUrl = buildConsentUrl(selectedAgent, selectedCategories, stateValue, returnUrl);
  const connectorUrl = buildConnectorUrl(linkToken, selectedAgent);

  const backendRouteSnippet = `// src/app/api/memoryos/connect/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const MEMORYOS_API_URL = process.env.MEMORYOS_API_URL ?? "${apiBaseUrl}";
const MEMORYOS_API_KEY = process.env.MEMORYOS_API_KEY;
const MEMORYOS_AGENT_ID = process.env.MEMORYOS_AGENT_ID;
const MEMORYOS_CONSENT_URL = process.env.MEMORYOS_CONSENT_URL ?? "${consentBaseUrl || "https://consent.memoryos.io"}";

export async function POST() {
  const session = await auth();

  // Your app already knows this after login.
  // Use a stable internal customer ID, not a raw email address.
  const externalUserId = session.user.id;

  const response = await fetch(\`${"${MEMORYOS_API_URL}"}/v1/tenant/memory-passport/link-token\`, {
    method: "POST",
    headers: {
      Authorization: \`ApiKey ${"${MEMORYOS_API_KEY}"}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: MEMORYOS_AGENT_ID,
      external_user_id: externalUserId,
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "memoryos_link_failed" }, { status: 502 });
  }

  const payload = await response.json();
  const url = new URL("/connect", MEMORYOS_CONSENT_URL);
  url.searchParams.set("agent_id", MEMORYOS_AGENT_ID!);
  url.searchParams.set("link_token", payload.data.link_token);

  return NextResponse.json({ url: url.toString() });
}`;

  const frontendButtonSnippet = `// Your app UI
async function connectMemoryPassport() {
  const response = await fetch("/api/memoryos/connect", { method: "POST" });
  const data = await response.json();
  window.location.href = data.url;
}

<button onClick={connectMemoryPassport}>
  Connect Memory Passport
</button>`;

  const multiServiceSnippet = `import { MemoryOS } from "memoryos";

const mem = new MemoryOS({ apiKey: process.env.MEMORYOS_API_KEY! });

await mem.add(
  [{ role: "assistant", content: "Customer is on the Growth plan." }],
  "customer_123",
  { agentId: "billing-agent" },
  MemoryOS.source("billing-service")
);

await mem.add(
  [{ role: "assistant", content: "Support saw Starter plan last week." }],
  "customer_123",
  { agentId: "support-agent" },
  MemoryOS.source("support-service")
);

// MemoryOS keeps lineage for both sources and uses authority rules
// before retrieval, so the next agent receives the safer context.`;

  async function createConnector() {
    if (!selectedAgent || !externalUserId.trim()) {
      setConnectorError("Choose an agent and enter a test user ID first.");
      return;
    }
    setCreatingConnector(true);
    setConnectorError(null);
    setLinkToken("");
    try {
      const result = await createPassportLinkToken(getToken, { agent_id: selectedAgent.id, external_user_id: externalUserId.trim() });
      setLinkToken(result.link_token);
    } catch (error) {
      setConnectorError(formatStudioError(error));
    } finally {
      setCreatingConnector(false);
    }
  }

  function toggleCategory(category: MemoryCategory) {
    setSelectedCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  }

  function goNext() {
    const next = studioSteps.find((step) => step.index === Math.min(activeIndex + 1, studioSteps.length));
    if (next) setActiveStep(next.id);
  }

  return (
    <div
      className="space-y-6 pt-14 text-[15px] leading-relaxed text-slate-800 antialiased md:pt-0"
    >
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-8 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              <Sparkles className="size-3.5" /> Integration Studio
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-medium leading-tight tracking-[-0.01em] md:text-5xl">See the Memory Passport flow one step at a time.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Studio shows what belongs in your product, what your backend creates, and what MemoryOS hosts. No hidden magic: the signed-in customer ID comes from your own app session.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => setActiveStep("connector")} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"><Play className="size-4" /> Try connector flow</Button>
              <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10"><Link href="/memory-passport"><Fingerprint className="size-4" />Create Passport agent</Link></Button>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 text-sm font-semibold text-slate-200">Who does what</div>
            <div className="space-y-3">
              {[
                ["Your app", "shows the button and owns the signed-in customer ID"],
                ["Your backend", "creates a single-use connector link with a private API key"],
                ["MemoryOS", "handles consent, categories, grants, provenance, and retrieval"],
                ["User", "approves access and can later limit, revoke, correct, or delete"],
              ].map(([title, body], index) => (
                <div key={title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-cyan-400 text-sm font-bold text-slate-950">{index + 1}</span>
                  <div><div className="font-semibold">{title}</div><div className="text-sm text-slate-400">{body}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-4">
        {studioSteps.map((step) => <StepButton key={step.id} step={step} active={activeStep === step.id} complete={step.index < activeIndex} onClick={() => setActiveStep(step.id)} />)}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 md:p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Step {activeIndex}</div>
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-medium tracking-[-0.01em] text-slate-950">{studioSteps.find((step) => step.id === activeStep)?.title}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{studioSteps.find((step) => step.id === activeStep)?.summary}</p>
            </div>
            {activeStep !== "source" ? <Button onClick={goNext} variant="outline">Next step <ChevronRight className="size-4" /></Button> : null}
          </div>
        </div>

        {activeStep === "agent" ? (
          <div className="grid gap-5 p-5 lg:grid-cols-[0.95fr_1.05fr] md:p-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-lg font-medium text-slate-950"><Fingerprint className="size-5 text-sky-600" /> Passport agent identity</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">This is the public app identity users see before they approve memory access. Create one per AI product or major agent experience.</p>
              <div className="mt-5">
                {agentsQuery.error ? <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{displayApiError(agentsQuery.error) ?? "Could not load Passport agents."}</div> : null}
                <AgentPicker agents={agents} selectedAgentId={selectedAgent?.id ?? ""} onSelect={setSelectedAgentId} />
              </div>
            </div>
            <div className="rounded-3xl border border-sky-100 bg-sky-50 p-5">
              <div className="text-lg font-medium text-slate-950">What the user sees</div>
              <div className="mt-5 rounded-[1.5rem] border border-sky-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-sky-100 font-bold text-sky-700">{(selectedAgent?.name ?? "AI").slice(0, 2).toUpperCase()}</div>
                  <div>
                    <div className="text-xl font-semibold text-slate-950">{selectedAgent?.name ?? "Your AI agent"}</div>
                    <div className="mt-1 text-sm text-slate-500">{selectedAgent?.website_url ?? "https://yourapp.com"}</div>
                    <div className="mt-3 flex flex-wrap gap-2">{(selectedAgent?.default_categories_requested.length ? selectedAgent.default_categories_requested : defaultCategories).map((category) => <Badge key={category} variant="secondary">{categoryLabels[category]}</Badge>)}</div>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">Users approve categories on MemoryOS. Your app receives access only after the user confirms.</div>
              </div>
            </div>
          </div>
        ) : null}

        {activeStep === "consent" ? (
          <div className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr] md:p-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-lg font-medium text-slate-950"><Link2 className="size-5 text-sky-600" /> Consent URL</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">Use this when your agent needs permission to read a user's Memory Passport. Put the generated URL behind a button such as Connect shared memory. The URL starts a permission flow; it does not grant access by itself.</p>
              <div className="mt-5 grid gap-3">
                <div><label className="text-sm font-medium text-slate-700">State / request ID</label><Input value={stateValue} onChange={(event) => setStateValue(event.target.value)} className="mt-1 bg-white" /><p className="mt-1 text-xs leading-5 text-slate-500">Optional value your app receives back after approval. Use it to match this consent result to the right user, session, or request.</p></div>
                <div><label className="text-sm font-medium text-slate-700">Return URL</label><Input value={returnUrl} onChange={(event) => setReturnUrl(event.target.value)} className="mt-1 bg-white" /><p className="mt-1 text-xs text-slate-500">Optional. Leave blank to show MemoryOS success screen.</p></div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="mb-2 text-sm font-medium text-slate-700">Requested categories</div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(Object.keys(categoryLabels) as MemoryCategory[]).map((category) => (
                    <button type="button" key={category} onClick={() => toggleCategory(category)} className={cn("flex items-center justify-between rounded-2xl border p-3 text-left text-sm transition", selectedCategories.includes(category) ? "border-sky-300 bg-sky-50 text-sky-950" : "border-slate-200 bg-white text-slate-600")}>
                      <span className="font-semibold">{categoryLabels[category]}</span>{selectedCategories.includes(category) ? <CheckCircle2 className="size-4 text-sky-600" /> : null}
                    </button>
                  ))}
                </div>
              </div>
              <UrlBox value={consentUrl} fallback="Set NEXT_PUBLIC_CONSENT_BASE_URL and choose a Passport agent to generate this link." />
              <div className="flex flex-wrap gap-2">
                <Button disabled={!consentUrl} onClick={() => void copyText(consentUrl)}><Copy className="size-4" />Copy consent URL</Button>
                {consentUrl ? <Button asChild variant="outline"><a href={consentUrl} target="_blank" rel="noreferrer">Preview<ExternalLink className="size-4" /></a></Button> : <Button disabled variant="outline">Preview<ExternalLink className="size-4" /></Button>}
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-lg font-medium text-slate-950"><Building2 className="size-5 text-sky-600" /> What your product shows</div>
                <p className="mt-1 text-sm text-slate-600">For the consent URL path, your app can show one button. Clicking it opens the generated MemoryOS consent page.</p>
                <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-semibold text-slate-950">Shared memory</div>
                      <p className="mt-1 text-sm text-slate-600">Let this agent use the Memory Passport categories you approve.</p>
                    </div>
                    {consentUrl ? (
                      <Button asChild><a href={consentUrl} target="_blank" rel="noreferrer">Connect shared memory</a></Button>
                    ) : (
                      <Button disabled>Connect shared memory</Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeStep === "connector" ? (
          <div className="grid items-start gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr] md:p-6">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 text-lg font-medium text-slate-950"><LockKeyhole className="size-5 text-emerald-700" /> Secure-link connector</div>
              <p className="mt-2 text-sm leading-6 text-slate-700">Use this when you do not have OAuth/OIDC yet. Your backend creates a single-use link after your customer is already signed into your product.</p>
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4 text-sm leading-6 text-emerald-950">In production, do not type user IDs manually. The ID comes from your own session, for example <code className="rounded bg-emerald-100 px-1">session.user.id</code>.</div>
              <div className="mt-4"><label className="text-sm font-medium text-slate-700">Test user ID in your app</label><Input value={externalUserId} onChange={(event) => setExternalUserId(event.target.value)} className="mt-1 bg-white" /><p className="mt-1 text-xs text-slate-500">Use a stable internal ID like customer_123, not a raw email.</p></div>
              <Button className="mt-4" onClick={() => void createConnector()} disabled={creatingConnector || !selectedAgent || !externalUserId.trim()}>{creatingConnector ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}Create real connector link</Button>
              {connectorError ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800">{connectorError}</div> : null}
              {connectorUrl ? <div className="mt-4 space-y-3"><UrlBox value={connectorUrl} fallback="" /><div className="flex flex-wrap gap-2"><Button onClick={() => void copyText(connectorUrl)}><Copy className="size-4" />Copy connector link</Button><Button asChild variant="outline"><a href={connectorUrl} target="_blank" rel="noreferrer">Test link<ExternalLink className="size-4" /></a></Button></div><p className="text-xs text-slate-500">Single-use link. Create a fresh one each time a signed-in user starts the connection flow.</p></div> : null}
            </div>
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-lg font-medium text-slate-950"><Building2 className="size-5 text-sky-600" /> What your product shows</div>
                <p className="mt-1 text-sm text-slate-600">One button in your app. Your backend handles the token and signed-in user ID.</p>
                <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4"><div><div className="text-sm font-semibold text-slate-950">Acme AI Settings</div><div className="text-xs text-slate-500">Signed in as {externalUserId || "customer_123"}</div></div><Badge className="bg-emerald-100 text-emerald-800">Account verified</Badge></div>
                  <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold text-slate-950">Memory Passport</div><p className="mt-1 text-sm text-slate-600">Let this AI use memories you approve. You can revoke access anytime.</p></div><Button onClick={() => void createConnector()} disabled={creatingConnector || !selectedAgent}>Connect Memory Passport</Button></div>
                </div>
              </div>
              <CodeBlock code={backendRouteSnippet} title="Backend route for the connector button" />
              <CodeBlock code={frontendButtonSnippet} title="Frontend button" />
            </div>
          </div>
        ) : null}

        {activeStep === "source" ? (
          <div className="grid items-start gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr] md:p-6">
            <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5">
              <div className="flex items-center gap-2 text-lg font-medium text-slate-950"><GitBranch className="size-5 text-violet-600" /> Multi-service source truth</div>
              <p className="mt-2 text-sm leading-6 text-slate-700">If your company has Billing, Support, CRM, or LMS agents, each service can write with source metadata. MemoryOS keeps provenance and resolves conflict before retrieval.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-violet-200 bg-white p-4"><div className="text-sm font-semibold text-violet-950">Billing service</div><p className="mt-2 text-sm text-violet-800">Customer is on Growth.</p><Badge className="mt-3 bg-violet-100 text-violet-900">authoritative for subscription</Badge></div><div className="rounded-2xl border border-amber-200 bg-white p-4"><div className="text-sm font-semibold text-amber-950">Support service</div><p className="mt-2 text-sm text-amber-800">Customer previously saw Starter.</p><Badge className="mt-3 bg-amber-100 text-amber-900">kept as historical evidence</Badge></div></div>
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">Retrieval result: the next agent receives Growth as the active answer, with Starter preserved as source history instead of silently deleted.</div>
            </div>
            <div className="space-y-4">
              <CodeBlock code={multiServiceSnippet} title="Multi-service write example" />
              <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-4"><KeyRound className="mb-3 size-5 text-sky-600" /><div className="font-semibold text-slate-950">Backend key only</div><p className="mt-2 text-sm leading-6 text-slate-600">Never expose tenant API keys in browser code.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><ShieldCheck className="mb-3 size-5 text-sky-600" /><div className="font-semibold text-slate-950">Governed memory</div><p className="mt-2 text-sm leading-6 text-slate-600">Conflicts, sources, provenance, and corrections stay inspectable.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><Fingerprint className="mb-3 size-5 text-sky-600" /><div className="font-semibold text-slate-950">User approves</div><p className="mt-2 text-sm leading-6 text-slate-600">Consent and connector links only start a review flow.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><RefreshCw className="mb-3 size-5 text-sky-600" /><div className="font-semibold text-slate-950">Close the loop</div><p className="mt-2 text-sm leading-6 text-slate-600">Send retrieval feedback when memory helped, missed, or was corrected.</p></div></div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}