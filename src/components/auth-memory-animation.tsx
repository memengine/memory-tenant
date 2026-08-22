import { Bot, Check, GitMerge, ShieldCheck, Sparkles } from "lucide-react";

const agents = [
  { name: "Support agent", memory: "Prefers concise answers", tone: "cyan" },
  { name: "Learning agent", memory: "Prefers detailed lessons", tone: "violet" },
] as const;

const features = [
  {
    eyebrow: "Conflict resolved",
    title: "Reconcile competing preferences into one current truth.",
    detail: "Source-aware / Reviewable / Non-destructive",
    icon: GitMerge,
  },
  {
    eyebrow: "Agents synchronized",
    title: "Carry approved context across every connected agent.",
    detail: "Shared safely / Tenant governed / Always current",
    icon: Sparkles,
  },
  {
    eyebrow: "Consent enforced",
    title: "Share only the memory categories the user approved.",
    detail: "Scoped access / User controlled / Auditable",
    icon: ShieldCheck,
  },
] as const;

export function AuthMemoryAnimation() {
  return (
    <div
      className="memory-demo relative h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-black"
      aria-label="Two agent memories being reconciled into one governed MemoryOS record"
    >
      <div className="memory-demo__grid" />
      <div className="memory-demo__glow memory-demo__glow--one" />
      <div className="memory-demo__glow memory-demo__glow--two" />

      <div className="absolute left-6 top-6 z-20 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/80 px-3 py-1.5 text-[11px] font-bold text-slate-200 backdrop-blur-md">
        <ShieldCheck className="size-3.5 text-slate-300" />
        Memory should follow the user
      </div>

      <div className="memory-demo__stage">
        <div className="memory-demo__agents">
          {agents.map((agent, index) => (
            <article
              key={agent.name}
              className={`memory-demo__agent memory-demo__agent--${agent.tone}`}
              style={{ animationDelay: `${index * 0.7}s` }}
            >
              <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-3">
                <span className="flex size-7 items-center justify-center rounded-lg bg-white/[0.06] text-slate-300">
                  <Bot className="size-3.5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold text-white">{agent.name}</p>
                  <p className="text-[9px] text-slate-400">Memory captured</p>
                </div>
                <span className="ml-auto size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]" />
              </div>
              <div className="space-y-3 px-4 py-4">
                <div className="h-1.5 w-2/3 rounded-full bg-white/10" />
                <div className="h-1.5 w-5/6 rounded-full bg-white/[0.06]" />
                <div className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Preference</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-200">{agent.memory}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="memory-demo__flow" aria-hidden="true">
          <span className="memory-demo__line memory-demo__line--left" />
          <span className="memory-demo__merge"><GitMerge className="size-4" /></span>
          <span className="memory-demo__line memory-demo__line--right" />
        </div>

        <article className="memory-demo__record">
          <div className="memory-demo__record-glow" />
          <div className="memory-demo__feature-stack">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.eyebrow}
                  className="memory-demo__feature"
                  style={{ animationDelay: `${index * 5}s` }}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.12)]">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">{feature.eyebrow}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-300/10 px-2 py-0.5 text-[8px] font-bold text-emerald-200">
                        <Check className="size-2.5" /> Active
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-5 text-white">{feature.title}</p>
                    <p className="mt-3 text-[9px] text-slate-400">{feature.detail}</p>
                  </div>
                </div>
              );
            })}
            <span className="memory-demo__feature-progress" aria-hidden="true" />
          </div>
        </article>
      </div>

      <div className="absolute bottom-12 left-6 z-20 max-w-md">
        <h2 className="text-3xl font-semibold leading-tight tracking-[-0.035em] text-white xl:text-4xl">
          One memory layer.<br />Every agent in sync.
        </h2>
        <p className="mt-2 text-sm leading-5 text-slate-300">Resolve conflicts once. Carry trusted context everywhere.</p>
      </div>

      <style>{`
        .memory-demo__grid { position:absolute; inset:0; opacity:.12; background-image:linear-gradient(rgba(148,163,184,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.08) 1px,transparent 1px); background-size:38px 38px; mask-image:linear-gradient(to bottom,black,transparent 76%); }
        .memory-demo__glow { position:absolute; width:24rem; height:24rem; border-radius:999px; filter:blur(100px); opacity:.1; }
        .memory-demo__glow--one { top:8%; left:4%; background:#475569; }
        .memory-demo__glow--two { top:20%; right:0; background:#27272a; }
        .memory-demo__stage { position:absolute; z-index:5; top:17%; left:7%; right:7%; }
        .memory-demo__agents { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
        .memory-demo__agent { overflow:hidden; border:1px solid rgba(255,255,255,.1); border-radius:1rem; background:rgba(12,12,14,.88); box-shadow:0 18px 50px rgba(0,0,0,.25); backdrop-filter:blur(16px); animation:agent-enter 7s ease-in-out infinite; }
        .memory-demo__agent--cyan { border-color:rgba(255,255,255,.14); }
        .memory-demo__agent--violet { border-color:rgba(255,255,255,.14); }
        .memory-demo__flow { position:relative; height:4.5rem; }
        .memory-demo__line { position:absolute; top:1.85rem; width:calc(50% - 1.5rem); height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,.42)); transform-origin:center; animation:flow-line 7s ease-in-out infinite; }
        .memory-demo__line--left { left:1rem; transform:rotate(8deg); }
        .memory-demo__line--right { right:1rem; transform:rotate(-8deg) scaleX(-1); }
        .memory-demo__merge { position:absolute; z-index:2; left:50%; top:1rem; display:flex; width:2rem; height:2rem; align-items:center; justify-content:center; transform:translateX(-50%); border:1px solid rgba(255,255,255,.2); border-radius:.75rem; color:#cbd5e1; background:#111113; box-shadow:0 0 24px rgba(255,255,255,.08); animation:merge-pulse 7s ease-in-out infinite; }
        .memory-demo__record { position:relative; overflow:hidden; width:min(92%,32rem); min-height:7.4rem; margin:0 auto; padding:1.1rem; border:1px solid rgba(255,255,255,.16); border-radius:1.1rem; background:linear-gradient(135deg,rgba(24,24,27,.94),rgba(9,9,11,.96)); box-shadow:0 22px 70px rgba(0,0,0,.35); backdrop-filter:blur(18px); animation:record-resolve 7s ease-in-out infinite; }
        .memory-demo__record-glow { position:absolute; inset:auto 12% -70% 12%; height:8rem; border-radius:999px; background:#ffffff; filter:blur(55px); opacity:.06; }
        .memory-demo__feature-stack { position:relative; min-height:5.2rem; }
        .memory-demo__feature { position:absolute; inset:0; display:flex; align-items:flex-start; gap:.875rem; opacity:0; transform:translateY(7px); animation:feature-cycle 15s ease-in-out infinite; }
        .memory-demo__feature-progress { position:absolute; left:0; right:0; bottom:-1.1rem; height:2px; transform-origin:left; background:linear-gradient(90deg,#ffffff,#64748b); animation:feature-progress 5s linear infinite; }
        @keyframes agent-enter { 0%,12% { opacity:.62; transform:translateY(8px); } 28%,82% { opacity:1; transform:translateY(0); } 100% { opacity:.62; transform:translateY(8px); } }
        @keyframes flow-line { 0%,25% { opacity:0; background-size:0 100%; } 42%,78% { opacity:1; background-size:100% 100%; } 100% { opacity:0; } }
        @keyframes merge-pulse { 0%,32% { opacity:.45; transform:translateX(-50%) scale(.88); } 48%,78% { opacity:1; transform:translateX(-50%) scale(1); box-shadow:0 0 34px rgba(255,255,255,.14); } 100% { opacity:.45; transform:translateX(-50%) scale(.88); } }
        @keyframes record-resolve { 0%,42% { opacity:.55; transform:translateY(8px) scale(.985); } 58%,88% { opacity:1; transform:translateY(0) scale(1); box-shadow:0 22px 75px rgba(255,255,255,.06); } 100% { opacity:.55; transform:translateY(8px) scale(.985); } }
        @keyframes feature-cycle { 0%,4% { opacity:0; transform:translateY(7px); } 8%,29% { opacity:1; transform:translateY(0); } 33%,100% { opacity:0; transform:translateY(-6px); } }
        @keyframes feature-progress { from { transform:scaleX(0); opacity:.25; } 12% { opacity:.8; } to { transform:scaleX(1); opacity:.35; } }
        @media (prefers-reduced-motion:reduce) { .memory-demo__agent,.memory-demo__line,.memory-demo__merge,.memory-demo__record,.memory-demo__feature,.memory-demo__feature-progress { animation:none; } .memory-demo__agent,.memory-demo__line,.memory-demo__record { opacity:1; transform:none; } .memory-demo__merge { opacity:1; transform:translateX(-50%); } .memory-demo__feature { opacity:0; transform:none; } .memory-demo__feature:first-child { opacity:1; } .memory-demo__feature-progress { display:none; } }
      `}</style>
    </div>
  );
}
