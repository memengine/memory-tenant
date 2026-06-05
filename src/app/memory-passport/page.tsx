"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Fingerprint,
  Link2,
  Plus,
  ShieldAlert,
} from "lucide-react";

import { RevealKeyDialog } from "@/components/reveal-key-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createGlobalAgent,
  displayApiError,
  listGlobalAgents,
  type GlobalAgentData,
  type MemoryCategory,
} from "@/lib/api";

const ALL_CATEGORIES: Array<{ value: MemoryCategory; label: string; description: string }> = [
  {
    value: "preference",
    label: "Preferences",
    description: "Communication style, settings, and defaults.",
  },
  {
    value: "fact",
    label: "Facts",
    description: "Stable profile facts that help personalization.",
  },
  {
    value: "goal",
    label: "Goals",
    description: "Plans and outcomes the user is working toward.",
  },
  {
    value: "procedure",
    label: "Procedures",
    description: "How the user prefers to complete recurring work.",
  },
  {
    value: "relationship",
    label: "Relationships",
    description: "Teams, collaborators, and shared context.",
  },
  {
    value: "expertise",
    label: "Expertise",
    description: "Skills, tools, and domains the user knows.",
  },
];

const CONSENT_BASE = process.env.NEXT_PUBLIC_CONSENT_BASE_URL?.replace(/\/$/, "") || "";

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown";
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

function copyText(value: string) {
  return navigator.clipboard.writeText(value);
}

function buildConsentUrl(options: {
  agentId: string;
  categories: MemoryCategory[];
  state: string;
  redirectUri: string;
}) {
  if (!CONSENT_BASE) {
    return "";
  }
  const params = new URLSearchParams({ agent_id: options.agentId });
  if (options.categories.length > 0) {
    params.set("categories", options.categories.join(","));
  }
  if (options.state.trim()) {
    params.set("state", options.state.trim());
  }
  if (options.redirectUri.trim()) {
    params.set("redirect_uri", options.redirectUri.trim());
  }
  return `${CONSENT_BASE}/consent?${params.toString()}`;
}

function CategoryPicker({
  selected,
  onChange,
}: {
  selected: MemoryCategory[];
  onChange: (next: MemoryCategory[]) => void;
}) {
  function toggle(category: MemoryCategory) {
    onChange(
      selected.includes(category)
        ? selected.filter((item) => item !== category)
        : [...selected, category],
    );
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
              "min-h-28 rounded-2xl border p-4 text-left transition",
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
                  checked
                    ? "border-sky-500 bg-sky-600 text-white"
                    : "border-slate-300 text-transparent",
                ].join(" ")}
              >
                {checked ? <CheckCircle2 className="size-3.5" /> : null}
              </span>
            </span>
            <span className="mt-2 block text-sm leading-6 text-slate-500">
              {category.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AgentStatusBadge({ agent }: { agent: GlobalAgentData }) {
  if (agent.is_verified) {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
        Verified
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
      Pending MemoryOS review
    </Badge>
  );
}

export default function MemoryPassportPage() {
  const { isLoaded, getToken } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [defaultCategories, setDefaultCategories] = useState<MemoryCategory[]>([
    "preference",
    "fact",
    "goal",
  ]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [urlCategories, setUrlCategories] = useState<MemoryCategory[]>([
    "preference",
    "goal",
  ]);
  const [stateValue, setStateValue] = useState("user_session_id");
  const [redirectUri, setRedirectUri] = useState("");
  const [rawAgentKey, setRawAgentKey] = useState<string | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const agentsQuery = useSWR(
    isLoaded ? "tenant-global-agents" : null,
    () => listGlobalAgents(getToken),
    { refreshInterval: 30_000 },
  );

  const agents = useMemo(() => agentsQuery.data ?? [], [agentsQuery.data]);
  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? agents[0] ?? null,
    [agents, selectedAgentId],
  );

  const consentUrl = selectedAgent
    ? buildConsentUrl({
        agentId: selectedAgent.id,
        categories: urlCategories,
        state: stateValue,
        redirectUri,
      })
    : "";

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
      setMessage("Global agent created. It is now visible to MemoryOS operators for verification review.");
      await agentsQuery.mutate();
    } catch (error) {
      setMessage(displayApiError(error) ?? "Unable to create global agent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pt-14 md:pt-0">
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
          Memory Passport
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Global agents and consent URLs
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          Register cross-agent identities, copy the agent ID, and generate consent links for users who want to share approved memory with your agents.
        </p>
      </div>

      {message ? (
        <Card className="border border-slate-200 bg-slate-50">
          <CardContent className="py-4 text-sm text-slate-700">{message}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="size-5 text-sky-700" />
              Agents
            </CardTitle>
            <CardDescription>Public identities that can request Memory Passport access.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-950">{agents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-700" />
              Verified
            </CardTitle>
            <CardDescription>Agents trusted by MemoryOS on the consent page.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-950">
              {agents.filter((agent) => agent.is_verified).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-amber-700" />
              Needs review
            </CardTitle>
            <CardDescription>New agents operators can verify from the operator console.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-950">
              {agents.filter((agent) => !agent.is_verified).length}
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Create global agent
            </CardTitle>
            <CardDescription>
              The raw agent key is shown once after creation. Store it in your backend secret manager.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Agent name</span>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Study Buddy" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Website URL</span>
                <Input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://yourapp.com" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="AI tutor that uses approved shared memory." />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Logo URL</span>
                <Input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="https://yourapp.com/logo.png" />
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-slate-800">Default requested categories</div>
                <p className="text-sm text-slate-500">
                  These are only defaults. Each consent URL can preselect a different set, and users make the final choice.
                </p>
              </div>
              <CategoryPicker selected={defaultCategories} onChange={setDefaultCategories} />
            </div>

            <Button onClick={() => void handleCreateAgent()} disabled={busy || !name.trim()}>
              {busy ? "Creating..." : "Create Global Agent"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consent URL builder</CardTitle>
            <CardDescription>
              Build a link for a user-facing &quot;Connect shared memory&quot; button.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {agents.length > 0 ? (
              <>
                {!CONSENT_BASE ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Set <code>NEXT_PUBLIC_CONSENT_BASE_URL</code> for this dashboard environment before sharing consent links.
                  </div>
                ) : null}

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Agent</span>
                  <select
                    value={selectedAgent?.id ?? ""}
                    onChange={(event) => setSelectedAgentId(event.target.value)}
                    className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
                  >
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedAgent ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-950">{selectedAgent.name}</div>
                        <div className="mt-1 font-mono text-xs text-slate-500">{selectedAgent.id}</div>
                      </div>
                      <AgentStatusBadge agent={selectedAgent} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => void copyText(selectedAgent.id)}>
                        <Copy className="mr-2 size-4" />
                        Copy agent ID
                      </Button>
                      {selectedAgent.website_url ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={selectedAgent.website_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 size-4" />
                            Website
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800">Preselected categories</div>
                    <p className="text-sm text-slate-500">Users can add or remove categories on the consent page.</p>
                  </div>
                  <CategoryPicker selected={urlCategories} onChange={setUrlCategories} />
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">State</span>
                  <Input value={stateValue} onChange={(event) => setStateValue(event.target.value)} placeholder="secure_random_state" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Redirect URI optional</span>
                  <Input value={redirectUri} onChange={(event) => setRedirectUri(event.target.value)} placeholder="https://yourapp.com/integrations/memoryos/callback" />
                </label>

                <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-6 break-all text-slate-100">
                  {consentUrl || "Consent URL is not configured for this environment."}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void copyText(consentUrl)} disabled={!consentUrl}>
                    <Copy className="mr-2 size-4" />
                    Copy consent URL
                  </Button>
                  {consentUrl ? (
                    <Button variant="outline" asChild>
                      <a href={consentUrl} target="_blank" rel="noreferrer">
                        <Link2 className="mr-2 size-4" />
                        Preview
                      </a>
                    </Button>
                  ) : null}
                </div>
              </>
            ) : agentsQuery.error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="text-sm font-medium text-rose-800">
                  {displayApiError(agentsQuery.error)}
                </div>
                <Button className="mt-3" variant="outline" onClick={() => void agentsQuery.mutate()}>
                  Retry
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Create a global agent first, then generate consent URLs here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global agents</CardTitle>
          <CardDescription>
            Agent secrets are not shown again after creation. Create a new agent if a secret is lost.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agentsQuery.isLoading && !agentsQuery.data ? (
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-16 animate-pulse rounded-xl bg-slate-200" />
            </div>
          ) : agents.length > 0 ? (
            <div className="grid gap-3">
              {agents.map((agent) => (
                <article key={agent.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-slate-950">{agent.name}</h2>
                        <AgentStatusBadge agent={agent} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        Created {formatDate(agent.created_at)}
                      </p>
                      <p className="mt-2 font-mono text-xs text-slate-500">{agent.id}</p>
                      {agent.description ? (
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{agent.description}</p>
                      ) : null}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => void copyText(agent.id)}>
                      <Copy className="mr-2 size-4" />
                      Copy agent ID
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No global agents yet.
            </div>
          )}
        </CardContent>
      </Card>

      <RevealKeyDialog
        open={revealOpen}
        rawKey={rawAgentKey}
        onOpenChange={setRevealOpen}
        onCloseComplete={() => setRawAgentKey(null)}
      />
    </div>
  );
}
