import { Check } from "lucide-react";

const rows = [
  {
    label: "Starter monthly price",
    memoryos: "₹999 / month",
    mem0: "Higher entry pricing",
    wins: true,
  },
  {
    label: "Included calls",
    memoryos: "50,000 API calls",
    mem0: "Lower included volume",
    wins: true,
  },
  {
    label: "Free tier",
    memoryos: "5,000 calls, no card required",
    mem0: "Limited trial style entry",
    wins: true,
  },
  {
    label: "Quality gate",
    memoryos: "Included on every plan",
    mem0: "Not a pricing focus",
    wins: true,
  },
  {
    label: "Domain schemas",
    memoryos: "Growth and Enterprise",
    mem0: "Available with custom setup",
    wins: false,
  },
  {
    label: "Cross-agent memory",
    memoryos: "Native Memory Network",
    mem0: "App-specific memory",
    wins: true,
  },
  {
    label: "Data residency",
    memoryos: "IN1 by default, enterprise choice",
    mem0: "Region options vary",
    wins: true,
  },
];

export function ComparisonTable() {
  return (
    <section className="bg-[#F6F8FA] px-4 py-20 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          How we compare
        </h2>
        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.1fr_1fr_1fr] border-b border-slate-200 text-sm font-semibold">
            <div className="bg-slate-50 p-4 text-slate-600">Capability</div>
            <div className="bg-[#2E75B6] p-4 text-white">MemoryOS Starter</div>
            <div className="bg-slate-200 p-4 text-slate-700">Mem0 Starter</div>
          </div>
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[1.1fr_1fr_1fr] border-b border-slate-100 text-sm last:border-b-0"
            >
              <div className="p-4 font-medium text-slate-700">{row.label}</div>
              <div
                className={`flex items-center gap-2 p-4 ${
                  row.wins
                    ? "bg-emerald-50 font-bold text-emerald-900"
                    : "text-slate-800"
                }`}
              >
                {row.wins ? <Check className="size-4 text-emerald-600" /> : null}
                {row.memoryos}
              </div>
              <div className="p-4 text-slate-600">{row.mem0}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
