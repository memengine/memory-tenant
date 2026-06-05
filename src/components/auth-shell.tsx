import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  KeyRound,
  Network,
  ShieldCheck,
} from "lucide-react";

type AuthShellProps = {
  children: React.ReactNode;
  mode: "sign-in" | "sign-up";
};

export const authAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full border-0 bg-transparent p-0 shadow-none",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "h-12 rounded-xl border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]",
    socialButtonsBlockButtonText: "text-white",
    formFieldInput:
      "h-12 rounded-xl border-white/10 bg-white/[0.04] text-white",
    formButtonPrimary:
      "h-12 rounded-xl bg-white text-[#0D1117] hover:bg-slate-200",
    footerActionText: "text-slate-400",
    footerActionLink: "text-sky-300 hover:text-sky-200",
    dividerLine: "bg-white/10",
    dividerText: "text-slate-500",
    formFieldLabel: "text-slate-300",
    identityPreviewText: "text-white",
  },
};

export function AuthShell({ children, mode }: AuthShellProps) {
  const isSignUp = mode === "sign-up";

  return (
    <main className="grid min-h-screen bg-[#05070B] text-white lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-16">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-white/25 hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-xl">
            <div className="mx-auto mb-8 flex size-14 items-center justify-center rounded-2xl bg-white text-xl font-black text-[#0D1117] shadow-xl shadow-white/10">
              M
            </div>
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-black tracking-tight">
                {isSignUp ? "Create your MemoryOS workspace" : "Welcome back to MemoryOS"}
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-400">
                {isSignUp
                  ? "Start with a workspace, API key, and memory engine ready for your AI product."
                  : "Sign in to manage memories, API keys, schemas, and Memory Passport agents."}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/30 backdrop-blur">
              {children}
            </div>
            <p className="mx-auto mt-5 max-w-md text-center text-xs leading-6 text-slate-500">
              Secure authentication is handled by MemoryOS workspace identity.
              After sign in, you can create API keys, register agents, and choose
              your memory schema.
            </p>
          </div>
        </div>
      </section>

      <section className="relative hidden min-h-screen overflow-hidden bg-[#111827] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(45,212,191,0.22),transparent_26%),radial-gradient(circle_at_74%_62%,rgba(59,130,246,0.22),transparent_30%)]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative flex min-h-screen flex-col justify-center px-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-sm font-black text-cyan-100 backdrop-blur">
              <ShieldCheck className="size-4" />
              Tenant control surface
            </div>
            <h2 className="mt-10 text-5xl font-black leading-tight tracking-tight text-white">
              Memory that behaves like infrastructure.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Ship persistent AI memory with API keys, domain schemas,
              extraction jobs, consent controls, and operator visibility in one
              workspace.
            </p>
          </div>

          <div className="mt-12 max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="grid gap-4">
              {[
                ["1", "API key created", "Tenant-scoped access for your backend"],
                ["2", "Schema selected", "General, EdTech, or Customer Support"],
                ["3", "Memory active", "add() writes, get() retrieves context"],
              ].map(([step, title, copy]) => (
                <div
                  key={step}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#05070B]/70 p-4"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-sm font-black text-[#061016]">
                    {step}
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">{title}</div>
                    <div className="mt-1 text-sm text-slate-400">{copy}</div>
                  </div>
                  <CheckCircle2 className="ml-auto size-5 text-emerald-300" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 grid max-w-2xl gap-4 md:grid-cols-3">
            {[
              [Brain, "Domain schemas"],
              [KeyRound, "API keys"],
              [Network, "Memory Passport"],
            ].map(([Icon, label]) => {
              const CardIcon = Icon as typeof Brain;
              return (
                <div
                  key={label as string}
                  className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur"
                >
                  <CardIcon className="size-6 text-sky-200" />
                  <div className="mt-4 text-sm font-black text-white">
                    {label as string}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
