"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import {
  CheckCircle2,
  Copy,
  Info,
  Link2,
  Plus,
} from "lucide-react";

import { RevealKeyDialog } from "@/components/reveal-key-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createGlobalAgent,
  createPassportLinkToken,
  displayApiError,
  listGlobalAgents,
  type GlobalAgentData,
  type MemoryCategory,
  type PassportLinkTokenData,
} from "@/lib/api";

const ALL_CATEGORIES: Array<{ value: MemoryCategory; label: string; description: string }> = [
  { value: "preference", label: "Preferences", description: "Communication style, settings, and defaults." },
  { value: "fact", label: "Facts", description: "Stable profile facts that help personalization." },
  { value: "goal", label: "Goals", description: "Plans and outcomes the user is working toward." },
  { value: "procedure", label: "Procedures", description: "How the user prefers to complete recurring work." },
  { value: "relationship", label: "Relationships", description: "Teams, collaborators, and shared context." },
  { value: "expertise", label: "Expertise", description: "Skills, tools, and domains the user knows." },
];

const CONSENT_BASE = process.env.NEXT_PUBLIC_CONSENT_BASE_URL?.replace(/\/$/, "") || "";

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function copyText(value: string) {
  return navigator.clipboard.writeText(value);
}

function buildConsentUrl(options: {
  agentId: string;
  categories: MemoryCategory[];
  state: string;
  redirectUri: string;
}) {
  if (!CONSENT_BASE) return "";
  const params = new URLSearchParams({ agent_id: options.agentId });
  if (options.categories.length > 0) params.set("categories", options.categories.join(","));
  if (options.state.trim()) params.set("state", options.state.trim());
  if (options.redirectUri.trim()) params.set("redirect_uri", options.redirectUri.trim());
  return `${CONSENT_BASE}/consent?${params.toString()}`;
}

function buildConnectUrl(options: { agentId: string; linkToken: string }) {
  if (!CONSENT_BASE) return "";
  const params = new URLSearchParams({ agent_id: options.agentId, link_token: options.linkToken });
  return `${CONSENT_BASE}/connect?${params.toString()}`;
}

function CategoryPicker({
  selected,
  onChange,
}: {
  selected: MemoryCategory[];
  onChange: (next: MemoryCategory[]) => void;
}) {
  function toggle(category: MemoryCategory) {
    onChange(selected.includes(category) ? selected.filter((item) => item !== category) : [...selected, category]);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {ALL_CATEGORIES.map((category) => {
        const checked = selected.includes(category.value);
        return (
          <button
            key={category.value}
            type="button"
            onClick={() => toggle(category.value)}
            className={[
              "min-h-24 rounded-2xl border p-4 text-left transition",
              checked
                ? "border-sky-300 bg-sky-50 text-sky-950"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
            ].join(" ")}
          >
            <span className="flex items-center justify-between gap-3">
              <strong>{category.label}</strong>
              <span
                className={[
                  "flex size-5 items-center justify-center rounded-full border text-xs",
                  checked ? "border-sky-500 bg-sky-600 text-white" : "border-slate-300 text-transparent",
                ].join(" ")}
              >
                {checked ? <CheckCircle2 className="size-3.5" /> : null}
              </span>
            </span>
            <span className="mt-2 block text-sm leading-6 text-slate-500">{category.description}</span>
          </button>
        );
      })}
    </div>
  );
}

function AgentStatusBadge({ agent }: { agent: GlobalAgentData }) {
  if (agent.is_verified) {
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Verified</Badge>;
  }
  return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending MemoryOS review</Badge>;
}

export default function MemoryPassportPage() {
  const { isLoaded, getToken } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [defaultCategories, setDefaultCategories] = useState<MemoryCategory[]>(["preference", "fact", "goal"]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [urlCategories, setUrlCategories] = useState<MemoryCategory[]>(["preference", "goal"]);
  const [stateValue, setStateValue] = useState("user_session_id");
  const [redirectUri, setRedirectUri] = useState("");
  const [externalUserId, setExternalUserId] = useState("");
  const [linkTokenData, setLinkTokenData] = useState<PassportLinkTokenData | null>(null);
  const [rawAgentKey, setRawAgentKey] = useState<string | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<"consent" | "connector">("connector");

  const agentsQuery = useSWR(isLoaded ? "tenant-global-agents" : null, () => listGlobalAgents(getToken), {
    refreshInterval: 30_000,
  });

  const agents = useMemo(() => agentsQuery.data ?? [], [agentsQuery.data]);
  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? agents[0] ?? null,
    [agents, selectedAgentId],
  );

  const consentUrl = selectedAgent
    ? buildConsentUrl({ agentId: selectedAgent.id, categories: urlCategories, state: stateValue, redirectUri })
    : "";
  const connectUrl = selectedAgent && linkTokenData ? buildConnectUrl({ agentId: selectedAgent.id, linkToken: linkTokenData.link_token }) : "";
  const verifiedCount = agents.filter((agent) => agent.is_verified).length;
  const reviewCount = agents.length - verifiedCount;

  async function handleCreateAgent() {
    if (!name.trim()) {
      setMessage("Agent name is required.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const created = await createGlobalAgent(getToken, {
        name: name.trim(),
        description: description.trim() || null,
        website_url: websiteUrl.trim() || null,
        logo_url: logoUrl.trim() || null,
        default_categories_requested: defaultCategories,
        redirect_uri: "",
      });
      setName("");
      setDescription("");
      setWebsiteUrl("");
      setLogoUrl("");
      setDefaultCategories(["preference", "fact", "goal"]);
      setSelectedAgentId(created.id);
      setRawAgentKey(created.raw_agent_api_key);
      setRevealOpen(true);
      setMessage("Passport agent created. MemoryOS operators can now review it for the verification badge.");
      await agentsQuery.mutate();
    } catch (error) {
      setMessage(displayApiError(error) ?? "Unable to create Passport agent.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateLinkToken() {
    setLinkMessage(null);
    setLinkError(null);
    if (!selectedAgent) {
      setLinkError("Create or select a Passport agent first.");
      return;
    }
    if (!externalUserId.trim()) {
      setLinkError("Enter the user ID from your app before creating a connector link.");
      return;
    }
    setLinkBusy(true);
    setMessage(null);
    setLinkTokenData(null);
    try {
      const issued = await createPassportLinkToken(getToken, {
        agent_id: selectedAgent.id,
        external_user_id: externalUserId.trim(),
      });
      setLinkTokenData(issued);
      setLinkMessage("Connector link created. Open it immediately; it is single-use and expires automatically.");
    } catch (error) {
      setLinkError(displayApiError(error) ?? "Unable to create connector link.");
    } finally {
      setLinkBusy(false);
    }
  }

  return (
    <div
      className="flex flex-col gap-6 pt-14 text-[15px] leading-relaxed text-slate-800 antialiased md:pt-0"
    >
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-8 p-6 lg:grid-cols-[1fr_420px] lg:p-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-300">Optional · Cross-app sharing</span>
            <h1 className="mt-3 max-w-3xl text-3xl font-medium leading-tight tracking-[-0.01em] sm:text-4xl">
              Let users carry approved context between independent AI applications.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              You do not need Memory Passport to use MemoryOS inside your application. Enable this only when a user chooses to share selected context across products, organisations, or independently operated agents.
            </p>
            <Button asChild variant="outline" className="mt-5 border-white/20 bg-white/5 text-white hover:bg-white/10">
              <a href="/sdk">Use normal governed memory instead</a>
            </Button>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-sm font-medium text-white">Optional sharing setup</div>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              {["Create the public identity users will recognize.", "Add the recommended secure account connection.", "The user reviews categories and approves before sharing."].map((item, index) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-400 text-xs font-semibold text-slate-950">{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div
          className={
            message.startsWith("Unable") || message.startsWith("Agent name")
              ? "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
              : "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
          }
        >
          {message}
        </div>
      ) : null}

      <details className="group rounded-[2rem] border border-slate-200 bg-white" open={agents.length === 0 ? true : undefined}>
        <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-slate-950">
          <span className="flex items-center justify-between gap-4">
            <span>{agents.length === 0 ? "Step 1 · Create a sharing identity" : "Sharing identity settings"}</span>
            <span className="text-sm font-normal text-slate-500 group-open:hidden">Show</span>
            <span className="hidden text-sm font-normal text-slate-500 group-open:inline">Hide</span>
          </span>
        </summary>
      <section className="grid gap-6 border-t border-slate-100 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white">
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-5 text-sky-700" />
              Create Passport agent
            </CardTitle>
            <CardDescription>
              This is the public identity shown on the consent screen. The private key is shown once after creation and should stay in your backend secret manager.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <label className="block max-w-xl space-y-2">
              <span className="text-sm font-medium text-slate-700">Agent name</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Study Buddy" />
              <span className="block text-xs leading-5 text-slate-500">Use the product or assistant name your users already recognize.</span>
            </label>

            <details className="group rounded-2xl border border-slate-200 bg-slate-50">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-800">
                <span className="flex items-center justify-between gap-4">
                  <span>Advanced identity settings</span>
                  <span className="font-normal text-slate-500">Optional</span>
                </span>
              </summary>
              <div className="space-y-5 border-t border-slate-200 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Website URL</span>
                    <Input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://yourapp.com" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Logo URL</span>
                    <Input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="https://yourapp.com/logo.png" />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Description</span>
                    <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="AI tutor that uses approved shared memory." />
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800">Default categories</div>
                    <p className="text-sm text-slate-500">Users can change these defaults before approving access.</p>
                  </div>
                  <CategoryPicker selected={defaultCategories} onChange={setDefaultCategories} />
                </div>
              </div>
            </details>

            <Button onClick={() => void handleCreateAgent()} disabled={busy || !name.trim()}>
              {busy ? "Creating..." : "Create agent identity"}
            </Button>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workspace status</CardTitle>
              <CardDescription>Passport identities registered by this workspace.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-2xl font-medium text-slate-950">{agents.length}</div>
                <div className="mt-1 text-xs text-slate-500">Agents</div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-2xl font-medium text-emerald-900">{verifiedCount}</div>
                <div className="mt-1 text-xs text-emerald-700">Verified</div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <div className="text-2xl font-medium text-amber-900">{reviewCount}</div>
                <div className="mt-1 text-xs text-amber-700">Review</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-sky-100 bg-sky-50/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="size-4 text-sky-700" />
                Which link should I use?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
              <p><strong>Consent URL:</strong> reusable permission link for your AI agent.</p>
              <p><strong>Secure-link connector:</strong> single-use link for one signed-in app user when you need account binding.</p>
            </CardContent>
          </Card>
        </aside>
      </section>
      </details>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>{agents.length > 0 ? "Step 2 · Add cross-app sharing" : "Add cross-app sharing"}</CardTitle>
              <CardDescription>
                Use the secure account connection for most applications. The reusable consent URL remains available as an advanced alternative.
              </CardDescription>
            </div>
            <div className="grid rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:grid-cols-2">
              <button type="button" onClick={() => setShareMode("connector")} className={["rounded-xl px-4 py-2 text-sm font-semibold transition", shareMode === "connector" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:text-slate-800"].join(" ")}>Secure connection · Recommended</button>
              <button type="button" onClick={() => setShareMode("consent")} className={["rounded-xl px-4 py-2 text-sm font-semibold transition", shareMode === "consent" ? "bg-white text-sky-800 shadow-sm" : "text-slate-500 hover:text-slate-800"].join(" ")}>Reusable consent URL</button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          {agents.length > 0 ? (
            <>
              {!CONSENT_BASE ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Consent app URL is not configured for this dashboard environment yet. Set NEXT_PUBLIC_CONSENT_BASE_URL before sharing links with users.
                </div>
              ) : null}

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Agent</span>
                <Select
                  value={selectedAgent?.id ?? ""}
                  onValueChange={(value) => setSelectedAgentId(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              {selectedAgent ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950">{selectedAgent.name}</span>
                        <AgentStatusBadge agent={selectedAgent} />
                      </div>
                      <div className="mt-1 font-mono text-xs text-slate-500">{selectedAgent.id}</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => void copyText(selectedAgent.id)}><Copy className="mr-2 size-4" />Copy agent ID</Button>
                  </div>
                </div>
              ) : null}

              {shareMode === "consent" ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
                    Use this for the normal Memory Passport flow. Your app opens this URL when a user clicks <strong>Connect shared memory</strong>. The user reviews the agent and approves categories before anything is shared.
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-slate-800">Preselected categories</div>
                      <p className="text-sm text-slate-500">Users can add or remove categories on the consent screen.</p>
                    </div>
                    <CategoryPicker selected={urlCategories} onChange={setUrlCategories} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">State</span>
                      <Input value={stateValue} onChange={(event) => setStateValue(event.target.value)} placeholder="secure_random_state" />
                      <span className="block text-xs leading-5 text-slate-500">Returned to your app so you can match the consent result.</span>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Return URL optional</span>
                      <Input value={redirectUri} onChange={(event) => setRedirectUri(event.target.value)} placeholder="https://yourapp.com/integrations/memoryos/callback" />
                      <span className="block text-xs leading-5 text-slate-500">Leave blank to show the MemoryOS success screen.</span>
                    </label>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-6 break-all text-slate-100">{consentUrl || "Consent URL is not configured for this environment."}</div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void copyText(consentUrl)} disabled={!consentUrl}><Copy className="mr-2 size-4" />Copy consent URL</Button>
                    {consentUrl ? <Button variant="outline" asChild><a href={consentUrl} target="_blank" rel="noreferrer"><Link2 className="mr-2 size-4" />Preview</a></Button> : null}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
                    <strong>Recommended:</strong> your backend creates a single-use link for the signed-in customer. MemoryOS then asks the user to approve the connection. No MemoryOS button is required in your product until you choose to offer cross-app sharing.
                  </div>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">User ID in your app</span>
                    <Input
                      value={externalUserId}
                      onChange={(event) => {
                        setExternalUserId(event.target.value);
                        setLinkTokenData(null);
                        setLinkMessage(null);
                        setLinkError(null);
                      }}
                      placeholder="cust_8a72 or user_123"
                    />
                    <span className="block text-xs leading-5 text-slate-500">This is only for manual testing here. In production your backend passes the signed-in user ID automatically.</span>
                  </label>

                  <Button variant="outline" onClick={() => void handleCreateLinkToken()} disabled={linkBusy || !selectedAgent || !externalUserId.trim()}>
                    {linkBusy ? "Creating connector link..." : "Create connector link"}
                  </Button>

                  {linkError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">{linkError}</div> : null}
                  {linkMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">{linkMessage}</div> : null}

                  {linkTokenData ? (
                    <>
                      <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-6 break-all text-slate-100">{connectUrl || "Connect URL is not configured for this environment."}</div>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => void copyText(connectUrl)} disabled={!connectUrl}><Copy className="mr-2 size-4" />Copy connector link</Button>
                        {connectUrl ? <Button variant="outline" asChild><a href={connectUrl} target="_blank" rel="noreferrer"><Link2 className="mr-2 size-4" />Test link</a></Button> : null}
                      </div>
                      <p className="text-xs leading-5 text-slate-500">Expires in {Math.round(linkTokenData.expires_in_seconds / 60)} minutes. Create a fresh link each time the user starts the connection flow.</p>
                    </>
                  ) : null}
                </div>
              )}
            </>
          ) : agentsQuery.error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="text-sm font-medium text-rose-800">{displayApiError(agentsQuery.error)}</div>
              <Button className="mt-3" variant="outline" onClick={() => void agentsQuery.mutate()}>Retry</Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              Create a Passport agent first. Then this area will generate a consent URL or secure connector link.
            </div>
          )}
        </CardContent>
      </Card>

      <details className="group rounded-[2rem] border border-slate-200 bg-white">
        <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-slate-950">
          <span className="flex items-center justify-between gap-4">
            <span>Developer details and existing identities</span>
            <span className="text-sm font-normal text-slate-500 group-open:hidden">Show</span>
            <span className="hidden text-sm font-normal text-slate-500 group-open:inline">Hide</span>
          </span>
        </summary>
      <Card className="rounded-none border-x-0 border-b-0 shadow-none">
        <CardHeader>
          <CardTitle>Passport agents</CardTitle>
          <CardDescription>Public identities registered by this workspace. Private keys are shown only once at creation time.</CardDescription>
        </CardHeader>
        <CardContent>
          {agentsQuery.isLoading && !agentsQuery.data ? (
            <div className="space-y-3"><div className="h-16 animate-pulse rounded-xl bg-slate-200" /><div className="h-16 animate-pulse rounded-xl bg-slate-200" /></div>
          ) : agents.length > 0 ? (
            <div className="grid gap-3">
              {agents.map((agent) => (
                <article key={agent.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-950">{agent.name}</h2><AgentStatusBadge agent={agent} /></div>
                      <p className="mt-1 text-sm text-slate-500">Created {formatDate(agent.created_at)}</p>
                      <p className="mt-2 font-mono text-xs text-slate-500">{agent.id}</p>
                      {agent.description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{agent.description}</p> : null}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => void copyText(agent.id)}><Copy className="mr-2 size-4" />Copy agent ID</Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No Passport agents yet.</div>
          )}
        </CardContent>
      </Card>
      </details>

      <RevealKeyDialog open={revealOpen} rawKey={rawAgentKey} onOpenChange={setRevealOpen} onCloseComplete={() => setRawAgentKey(null)} />
    </div>
  );
}
