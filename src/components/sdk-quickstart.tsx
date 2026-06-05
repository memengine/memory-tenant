"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const quickStartSteps = [
  {
    step: "Step 1",
    title: "Install SDK",
    description: "Install the Python SDK in your app environment.",
    code: "pip install memoryos",
  },
  {
    step: "Step 2",
    title: "Add API key to .env",
    description: "Store your tenant API key in an environment variable.",
    code: "MEMORYOS_API_KEY=your_api_key_here",
  },
  {
    step: "Step 3",
    title: "Call mem.add() and mem.get()",
    description: "Write memory once, then fetch it back in your app flow.",
    code: [
      "import os",
      "from memoryos import Memory",
      "",
      'mem = Memory(api_key=os.environ["MEMORYOS_API_KEY"])',
      "",
      "mem.add(",
      '    messages=[{"role": "user", "content": "User prefers Python over Go"}],',
      '    external_user_id="alex",',
      ")",
      "",
      "memories = mem.get(",
      '    query="What does this user prefer?",',
      '    external_user_id="alex",',
      ")",
    ].join("\n"),
  },
] as const;

type SdkQuickstartProps = {
  emptyState?: boolean;
};

export function SdkQuickstart({ emptyState = false }: SdkQuickstartProps) {
  return (
    <Card className={emptyState ? "border-sky-200 bg-sky-50/50" : ""}>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-sky-200 bg-white text-sky-700">
            Installation Guide
          </Badge>
          <Badge className="bg-slate-950 text-white hover:bg-slate-950">
            SDK Integration
          </Badge>
        </div>
        <div>
          <CardTitle>Quick start your SDK integration</CardTitle>
          <p className="mt-2 text-sm text-slate-600">
            Start with the SDK flow only: install the package, add your API key to
            environment variables, then call <code>mem.add()</code> and <code>mem.get()</code>.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {emptyState ? (
          <div className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-medium text-sky-900">
            No memories yet. Follow the quick start above.
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-3">
          {quickStartSteps.map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                {item.step}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                <code>{item.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
