"use client";

import Link from "next/link";
import {
  BookOpen,
  Boxes,
  Code2,
  ExternalLink,
  KeyRound,
  Play,
  ServerCog,
  ShieldCheck,
} from "lucide-react";

import { SdkQuickstart } from "@/components/sdk-quickstart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const docsUrl = "https://memoryengine.mintlify.app";

export default function SdkPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
            Developer Integration
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Connect MemoryOS to your app
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Use the SDK in your backend, or run the MCP server as a sidecar for
            agent runtimes that prefer tools over application dependencies.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/api-keys">
              <KeyRound className="size-4" />
              API Keys
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href={docsUrl} target="_blank" rel="noreferrer">
              <BookOpen className="size-4" />
              Docs
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
          <Button asChild>
            <Link href="/playground">
              <Play className="size-4" />
              Try Playground
            </Link>
          </Button>
        </div>
      </div>

      <SdkQuickstart emptyState />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <ServerCog className="size-5" />
              </div>
              <div>
                <CardTitle>Run MemoryOS MCP as a sidecar</CardTitle>
                <CardDescription>
                  Best for Claude Desktop, Cursor, internal agents, and teams
                  that do not want a new SDK inside their core backend.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Isolated",
                  text: "MemoryOS runs outside the main app process.",
                },
                {
                  icon: Boxes,
                  title: "All schemas",
                  text: "General, EdTech, and Support use the same MCP server.",
                },
                {
                  icon: Code2,
                  title: "Tool based",
                  text: "Agents call memory tools instead of SDK methods.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-emerald-200 bg-white p-4"
                >
                  <item.icon className="size-4 text-emerald-700" />
                  <div className="mt-3 text-sm font-semibold text-slate-950">
                    {item.title}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>

            <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              <code>{`pip install memoryos-mcp

MEMORYOS_API_KEY=mem_live_xxx
MEMORYOS_API_URL=https://api.memoryos.io

memoryos-mcp`}</code>
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MCP tools exposed</CardTitle>
            <CardDescription>
              The MCP server wraps the same production API your SDK uses.
              Domain routing still comes from this workspace setting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "memoryos_add_memory",
              "memoryos_get_context",
              "memoryos_list_memories",
              "memoryos_delete_memory",
              "memoryos_get_domain_schema",
              "memoryos_get_edtech_profile",
              "memoryos_get_support_stats",
              "memoryos_create_consent_url",
            ].map((tool) => (
              <div
                key={tool}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700"
              >
                {tool}
              </div>
            ))}
            <Button asChild variant="outline" className="mt-2 w-full">
              <a href={`${docsUrl}/sdk/mcp`} target="_blank" rel="noreferrer">
                Read MCP docs
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>1. Create an API key</CardTitle>
            <CardDescription>
              Use a tenant API key from the API Keys page. Never put it in browser code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/api-keys">Open API Keys</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Add memory</CardTitle>
            <CardDescription>
              Store useful user context after a conversation or workflow finishes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              <code>{`mem.add(
    messages=conversation,
    external_user_id="customer-123",
)`}</code>
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Retrieve context</CardTitle>
            <CardDescription>
              Fetch prompt-ready memory before your model generates the next answer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              <code>{`result = mem.get(
    query=user_message,
    external_user_id="customer-123",
)`}</code>
            </pre>
          </CardContent>
        </Card>

        <Card className="border-sky-200 bg-sky-50/50">
          <CardHeader>
            <CardTitle>4. Send retrieval feedback</CardTitle>
            <CardDescription>
              Use the retrieval ID when the answer was corrected or the agent had to ask for missing context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              <code>{`if result.retrieval_id:
    mem.feedback(
        retrieval_id=result.retrieval_id,
        outcome="user_corrected",
        correction="Actually, the user prefers Hindi replies.",
    )`}</code>
            </pre>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

