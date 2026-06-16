"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Fingerprint,
  Info,
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
  createPassportLinkToken,
  displayApiError,
  listGlobalAgents,
  type GlobalAgentData,
  type MemoryCategory,
  type PassportLinkTokenData,
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

function buildConnectUrl(options: { agentId: string; linkToken: string }) {
  if (!CONSENT_BASE) {
    return "";
  }
  const params = new URLSearchParams({
    agent_id: options.agentId,
    link_token: options.linkToken,
  });
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

function PassportStep({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
        {step}
      </div>
      <div className="mt-2 font-semibold text-slate-950">{title}</div>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
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
  const [externalUserId, setExternalUserId] = useState("");
  const [linkTokenData, setLinkTokenData] = useState<PassportLinkTokenData | null>(null);
  const [rawAgentKey, setRawAgentKey] = useState<string | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
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
  const connectUrl =
    selectedAgent && linkTokenData
      ? buildConnectUrl({ agentId: selectedAgent.id, linkToken: linkTokenData.link_token })
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
    <div className="flex flex-col gap-6 pt-14 md:pt-0">
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
          Memory Passport
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          User-approved memory for your AI agents
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          Create a public agent identity, share a permission link, and let users choose which
          Memory Passport categories your agent can read. Nothing is shared until the user
          approves it on the consent screen.
        </p>
      </div>

      <section className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <PassportStep
          step="Step 1"
          title="Create an agent identity"
          description="This is the public profile users see before approving access. The secret key stays in your backend."
        />
        <div className="hidden items-center text-slate-300 lg:flex">
          <ArrowRight className="size-5" />
        </div>
        <PassportStep
          step="Step 2"
          title="Share a consent link"
          description="Use the generated URL behind a button like Connect shared memory in your product."
        />
        <div className="hidden items-center text-slate-300 lg:flex">
          <ArrowRight className="size-5" />
        </div>
        <PassportStep
          step="Step 3"
          title="User stays in control"
          description="The user can edit categories, choose an expiry, revoke access, and resolve personal memory conflicts."
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-sky-100 bg-sky-50/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="size-4 text-sky-700" />
              Consent URL
            </CardTitle>
            <CardDescription>
              Use this when your AI agent wants permission to read a user's Memory Passport.
              Add it to a user-facing button such as Connect shared memory.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-emerald-100 bg-emerald-50/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Fingerprint className="size-4 text-emerald-700" />
              Secure-link connector
            </CardTitle>
            <CardDescription>
              Use this fallback when your app does not have OAuth/OIDC yet. After a signed-in
              user clicks Connect Memory Passport, your backend creates a one-time link.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

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
              Agent identities
            </CardTitle>
            <CardDescription>Profiles users see on the Memory Passport consent page.</CardDescription>
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
            <CardDescription>Reviewed identities that show a MemoryOS verification badge.</CardDescription>
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
            <CardDescription>Created agents waiting for MemoryOS operator review.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-950">
              {agents.filter((agent) => !agent.is_verified).length}
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Create Passport agent
            </CardTitle>
            <CardDescription>
              This creates the app identity shown to users during consent. The private key is
              shown once and should be stored only in your backend secret manager.
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
                  Pick the categories your agent usually needs. These are defaults only - users
                  can remove categories before approving access.
                </p>
              </div>
              <CategoryPicker selected={defaultCategories} onChange={setDefaultCategories} />
            </div>

            <Button onClick={() => void handleCreateAgent()} disabled={busy || !name.trim()}>
              {busy ? "Creating..." : "Create agent identity"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Share Memory Passport access</CardTitle>
            <CardDescription>
              Generate the link your product opens when a user clicks &quot;Connect shared
              memory&quot;. The link starts a permission flow; it does not grant access by itself.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {agents.length > 0 ? (
              <>
                {!CONSENT_BASE ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Consent links are not configured for this dashboard environment yet. Set
                    the consent app URL before sharing links with users.
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
                    <div className="mt-3 flex gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
                      <Info className="mt-0.5 size-4 shrink-0 text-sky-700" />
                      <span>
                        Agent ID is for your backend configuration. Users should receive the
                        consent URL, not the private agent key.
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800">Preselected categories</div>
                    <p className="text-sm text-slate-500">
                      These categories are preselected for convenience. The user can change
                      them before approving access.
                    </p>
                  </div>
                  <CategoryPicker selected={urlCategories} onChange={setUrlCategories} />
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">State</span>
                  <Input value={stateValue} onChange={(event) => setStateValue(event.target.value)} placeholder="secure_random_state" />
                  <span className="block text-xs leading-5 text-slate-500">
                    Optional value returned to your app after consent. Use your own session or
                    request ID so you can match the result.
                  </span>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Return URL optional</span>
                  <Input value={redirectUri} onChange={(event) => setRedirectUri(event.target.value)} placeholder="https://yourapp.com/integrations/memoryos/callback" />
                  <span className="block text-xs leading-5 text-slate-500">
                    Send the user back to your app after approval. If blank, MemoryOS shows a
                    clear success screen.
                  </span>
                </label>

                <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-6 break-all text-slate-100">
                  {consentUrl || "Consent URL is not configured for this environment."}
                </div>
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
                  Put this URL behind your product button. The user reviews your agent, chooses
                  categories, and can revoke access later from their Memory Passport.
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

                <div className="border-t border-slate-200 pt-5">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-950">Secure-link connector</h3>
                    <p className="text-sm leading-6 text-slate-600">
                      This is the no-OAuth connector path. In your app, a signed-in customer
                      clicks Connect Memory Passport, your backend creates a one-time link, and
                      the user reviews access on MemoryOS.
                    </p>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                      This dashboard generator is for manually checking one user flow. In
                      production, your backend calls the same API automatically for the
                      signed-in user and redirects them to the generated connector link.
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
                      <span className="block text-xs leading-5 text-slate-500">
                        For real users, pass this value from your authenticated app session
                        when the user clicks Connect Memory Passport.
                      </span>
                    </label>

                    <Button
                      variant="outline"
                      onClick={() => void handleCreateLinkToken()}
                      disabled={linkBusy || !selectedAgent || !externalUserId.trim()}
                    >
                      {linkBusy ? "Creating connector link..." : "Create connector link"}
                    </Button>

                    {linkError ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">
                        {linkError}
                      </div>
                    ) : null}

                    {linkMessage ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                        {linkMessage}
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
                      In production, generate this link server-side only after the user is
                      signed in to your app. Tell the user: MemoryOS will open so you can approve
                      the connector and choose what this AI can access. You can revoke it anytime.
                    </div>

                    {linkTokenData ? (
                      <>
                        <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-6 break-all text-slate-100">
                          {connectUrl || "Connect URL is not configured for this environment."}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => void copyText(connectUrl)} disabled={!connectUrl}>
                            <Copy className="mr-2 size-4" />
                            Copy connector link
                          </Button>
                          {connectUrl ? (
                            <Button variant="outline" asChild>
                              <a href={connectUrl} target="_blank" rel="noreferrer">
                                <Link2 className="mr-2 size-4" />
                                Test link
                              </a>
                            </Button>
                          ) : null}
                        </div>
                        <p className="text-xs leading-5 text-slate-500">
                          Expires in {Math.round(linkTokenData.expires_in_seconds / 60)} minutes.
                          Create a fresh link each time the user starts the connection flow.
                        </p>
                      </>
                    ) : null}
                  </div>
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
                Create a Passport agent first. Then this panel will generate the consent URL
                for your user-facing Connect shared memory button.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Passport agents</CardTitle>
          <CardDescription>
            Public agent identities registered by this workspace. Private keys are shown only
            once at creation time.
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
              No Passport agents yet.
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
