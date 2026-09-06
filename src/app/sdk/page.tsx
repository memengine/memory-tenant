"use client";

import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Code2,
  Copy,
  ExternalLink,
  KeyRound,
  Play,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const docsUrl = "https://docs.memoryo.dev";

const backendSnippet = `import os
from memoryos import Memory

mem = Memory(api_key=os.environ["MEMORYOS_API_KEY"])

# Store useful context after a conversation or workflow.
write = mem.add(
    messages=[
        {"role": "user", "content": "I prefer Hindi replies for product explanations."},
        {"role": "assistant", "content": "Got it. I will explain product details in Hindi when possible."},
    ],
    external_user_id="customer_123",
)

# Writes are asynchronous. Wait only when verifying the first integration.
if not write.job_id:
    raise RuntimeError(f"Memory write was not queued: {write.status}")
job = mem.wait_for_job(write.job_id)
if not job.succeeded:
    raise RuntimeError(f"Memory write failed: {job.error_summary or job.status}")

# Retrieve prompt-ready context before your model answers.
context = mem.get(
    query="How should I reply to this customer?",
    external_user_id="customer_123",
)`;

const steps = [
  {
    title: "Create an API key",
    body: "Generate one tenant API key and keep it only in your backend or server environment.",
    cta: "Open API Keys",
    href: "/api-keys",
    icon: KeyRound,
  },
  {
    title: "Install the SDK",
    body: "Add the package to your backend app. Do not call MemoryOS directly from browser code.",
    code: "pip install memoryo-sdk",
    icon: Code2,
  },
  {
    title: "Store and retrieve memory",
    body: "Run one add → wait → get verification with a stable external_user_id from your app.",
    icon: Sparkles,
  },
];

export default function SdkPage() {
  return (
    <div className="space-y-6 pt-14 md:pt-0">
      <section className="rounded-[2rem] border border-sky-100 bg-sky-50 p-6">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Recommended first integration</span>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-slate-950">Add governed memory without consent screens or a Memory Passport.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Use your existing application user IDs and authentication. Cross-app sharing is an optional capability you can enable later.</p>
      </section>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/api-keys"><KeyRound className="size-4" />API Keys</Link>
        </Button>
        <Button asChild variant="outline">
          <a href={docsUrl} target="_blank" rel="noreferrer"><BookOpen className="size-4" />Docs<ExternalLink className="size-3.5" /></a>
        </Button>
        <Button asChild>
          <Link href="/playground"><Play className="size-4" />Try Playground</Link>
        </Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card key={step.title} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                    <Icon className="size-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Step {index + 1}</span>
                </div>
                <CardTitle>{step.title}</CardTitle>
                <CardDescription>{step.body}</CardDescription>
              </CardHeader>
              <CardContent>
                {step.href ? (
                  <Button asChild variant="outline"><Link href={step.href}>{step.cta}</Link></Button>
                ) : step.code ? (
                  <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100"><code>{step.code}</code></pre>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                    Use the complete backend snippet below. It verifies one asynchronous write before retrieval.
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Copy this backend snippet</CardTitle>
                <CardDescription>
                  Replace the customer ID with the stable user ID from your app. Keep this code in your backend.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => void navigator.clipboard.writeText(backendSnippet)}>
                <Copy className="size-4" />Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <pre className="max-h-[560px] overflow-auto bg-slate-950 p-5 text-xs leading-6 text-slate-100 sm:text-sm">
              <code>{backendSnippet}</code>
            </pre>
          </CardContent>
        </Card>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
            <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-700" />
            <span>
              <strong>What this verifies:</strong> authentication, asynchronous extraction, persistence, and retrieval for one user.
            </span>
          </div>
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            <Clock3 className="mt-1 size-4 shrink-0 text-amber-700" />
            <span>
              <strong>After this works:</strong> add source metadata, provenance, feedback, agents, or MCP only when your product needs them.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
