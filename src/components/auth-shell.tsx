import Link from "next/link";
import {
  ArrowLeft,
  CircleAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type AuthShellProps = {
  children: React.ReactNode;
  mode: "sign-in" | "sign-up";
};

export const authAppearance = {
  variables: {
    colorPrimary: "#67e8f9",
    colorBackground: "#0a111d",
    colorInputBackground: "#111a28",
    colorInputText: "#f8fafc",
    colorText: "#f8fafc",
    colorTextSecondary: "#94a3b8",
    borderRadius: "12px",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  elements: {
    rootBox: "!mx-auto !flex !w-full !max-w-full !justify-center",
    cardBox: "!mx-auto !flex !w-full !max-w-full !justify-center !overflow-hidden !bg-transparent !shadow-none",
    card: "!mx-auto !w-full !max-w-full !overflow-hidden !border-0 !bg-transparent !p-0 !shadow-none",
    main: "!mx-auto !w-full !max-w-full !gap-3 !bg-transparent",
    form: "!mx-auto !w-full !max-w-full !gap-2.5",
    formField: "!gap-1.5",
    formFieldRow: "!gap-2",
    dividerRow: "!my-2",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "!h-9 !rounded-xl !border !border-white/15 !bg-white/[0.03] !text-white !shadow-none transition hover:!border-cyan-200/35 hover:!bg-white/[0.06]",
    socialButtonsBlockButtonText: "!font-semibold !text-slate-200",
    formFieldInput:
      "!h-9 !rounded-xl !border !border-white/15 !bg-[#111a28] !px-4 !text-white placeholder:!text-slate-500 !shadow-none !outline-none focus:!border-cyan-300/60 focus:!ring-2 focus:!ring-cyan-300/10",
    formButtonPrimary:
      "!h-9 !rounded-xl !bg-white !font-black !text-[#07111d] !shadow-none transition hover:!bg-cyan-50",
    footer: "hidden",
    footerPages: "hidden",
    footerPageLink: "hidden",
    footerAction: "hidden",
    footerActionText: "hidden",
    footerActionLink: "hidden",
    developmentModeBadge: "hidden",
    dividerLine: "!bg-white/10",
    dividerText: "!text-slate-500",
    formFieldLabel: "!text-xs !font-semibold !text-slate-300",
    formFieldInputShowPasswordButton: "!text-slate-500 hover:!text-slate-200",
    formFieldAction: "!text-cyan-300 hover:!text-cyan-200",
    formFieldSuccessText: "!text-emerald-300",
    formFieldErrorText: "!text-rose-300",
    alert: "!rounded-xl !border !border-rose-400/20 !bg-rose-400/10 !text-rose-200",
    formResendCodeLink: "!text-cyan-300 hover:!text-cyan-200",
    otpCodeFieldInput:
      "!h-9 !rounded-xl !border !border-white/15 !bg-[#111a28] !text-white",
    identityPreviewText: "!text-white",
  },
};

export function AuthShell({ children, mode }: AuthShellProps) {
  const isSignUp = mode === "sign-up";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#080d14] text-white lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(34,211,238,0.07),transparent_32%),linear-gradient(135deg,#080d14_0%,#09131e_50%,#0b0d17_100%)]" />

      <div className="relative mx-auto grid min-h-screen max-w-[1480px] lg:h-full lg:min-h-0 lg:grid-cols-[0.82fr_1.18fr]">
        <section className="relative flex min-h-screen flex-col border-white/10 px-5 py-5 sm:px-8 lg:h-full lg:min-h-0 lg:border-r lg:px-10 lg:py-6">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>

          <div className="flex min-h-0 flex-1 items-center justify-center py-6 lg:py-2">
            <div className="w-full max-w-[374px] text-center">
              <div className="mx-auto flex w-fit items-center gap-2.5 text-sm font-black tracking-tight text-white">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white">
                  <img src="/brand/logo-mark.svg" alt="" className="size-6" />
                </span>
                MemoryOS
              </div>

              <h1 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[2.15rem]">
                {isSignUp
                  ? "Create your MemoryOS workspace"
                  : "Welcome back to MemoryOS"}
              </h1>
              <p className="mx-auto mt-2.5 max-w-sm text-sm leading-5 text-slate-400">
                {isSignUp
                  ? "Give every agent one trusted memory layer."
                  : "Continue to your shared memory workspace."}
              </p>

              <div className="memoryos-auth-card mx-auto mt-4 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#0a111d] p-4 text-left text-white shadow-2xl shadow-black/20">
                {children}
                <div className="mt-4 border-t border-white/10 pt-3.5 text-center text-xs text-slate-400">
                  {isSignUp ? "Already have a workspace?" : "Don\'t have an account?"}{" "}
                  <Link
                    href={isSignUp ? "/sign-in" : "/sign-up"}
                    className="font-bold text-cyan-300 transition hover:text-cyan-200"
                  >
                    {isSignUp ? "Sign in" : "Sign up"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative hidden h-full min-h-0 overflow-hidden bg-[#080d14] p-5 lg:block xl:p-7">
          <div
            className="auth-memory-scene relative h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#050b17]"
            aria-label="A simulation of conflicting agent memories becoming synchronized"
          >
            <img
              src="/auth-memory-conflict.png"
              alt="A person frustrated by lost and conflicting AI conversations"
              className="absolute inset-0 size-full object-cover object-center opacity-80"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,11,23,0.18)_0%,transparent_45%,rgba(5,11,23,0.78)_100%)]" />

            <div className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#07111d]/75 px-3 py-1.5 text-[11px] font-bold text-slate-200 backdrop-blur-md">
              <ShieldCheck className="size-3.5 text-cyan-200" />
              Memory should follow the user
            </div>

            <div className="absolute bottom-6 left-6 z-20 max-w-sm">
              <h2 className="text-3xl font-semibold leading-tight tracking-[-0.035em] text-white xl:text-4xl">
                Agents forget. MemoryOS remembers.
              </h2>
              <p className="mt-2 text-sm leading-5 text-slate-300">
                One governed memory layer across every conversation.
              </p>
            </div>

            <div className="auth-memory-card auth-memory-card--conflict">
              <div className="auth-memory-card__icon bg-rose-400/10 text-rose-300">
                <CircleAlert className="size-4" />
              </div>
              <div>
                <p className="auth-memory-card__eyebrow text-rose-200">Agent conflict</p>
                <p className="auth-memory-card__copy">Two memories. Two answers.</p>
              </div>
            </div>

            <div className="auth-memory-resolution">
              <div className="auth-memory-resolution__mark">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
                  MemoryOS synchronized
                </p>
                <p className="mt-0.5 text-xs font-semibold text-white">
                  One trusted memory. Every agent.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
