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
  ServerCog,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const docsUrl = "https://memoryengine.mintlify.app";

const backendSnippet = `import os
from memoryos import Memory

mem = Memory(api_key=os.environ["MEMORYOS_API_KEY"])

# 1. Store useful context after a conversation or workflow.
mem.add(
    messages=[
        {"role": "user", "content": "I prefer Hindi replies for product explanations."},
        {"role": "assistant", "content": "Got it. I will explain product details in Hindi when possible."},
    ],
    external_user_id="customer_123",
    agent_id="support_bot",
    metadata={"source": "support_chat", "ticket_id": "TCK-1842"},
)

# 2. Retrieve prompt-ready context before your model answers.
context = mem.get(
    query="How should I reply to this customer?",
    external_user_id="customer_123",
)

# 3. Optional: close the loop if the retrieved memory was wrong or missing.
if context.retrieval_id:
    mem.feedback(
        retrieval_id=context.retrieval_id,
        outcome="helpful",
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
    code: "pip install memoryos",
    icon: Code2,
  },
  {
    title: "Store and retrieve memory",
    body: "Use a stable external_user_id from your app. MemoryOS handles extraction, scoring, provenance, and retrieval.",
    icon: Sparkles,
  },
];

export default function SdkPage() {
  return (
    <div className="space-y-6 pt-14 md:pt-0"><div className="flex flex-wrap gap-2">
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
                    Use the complete backend snippet below. It includes add, get, metadata, and feedback in one place.
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
                  Replace the customer ID, agent ID, and metadata with values from your app. This is the normal SDK path for solo builders and small teams.
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
              <strong>What this gives you:</strong> extraction, scoring, source metadata, provenance debugging, retrieval IDs, and feedback for retrospective correction.
            </span>
          </div>
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            <Clock3 className="mt-1 size-4 shrink-0 text-amber-700" />
            <span>
              <strong>MCP server:</strong> coming soon. SDK integration stays the primary production path until MCP has enough real user feedback.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}