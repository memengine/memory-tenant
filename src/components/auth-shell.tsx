import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthMemoryAnimation } from "@/components/auth-memory-animation";

type AuthShellProps = {
  children: React.ReactNode;
  mode: "sign-in" | "sign-up";
};

export const authAppearance = {
  variables: {
    colorPrimary: "#67e8f9",
    colorBackground: "#0a111d",
    colorInputBackground: "#e8eef7",
    colorInputText: "#0f172a",
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
      "!h-9 !rounded-xl !border !border-slate-300/70 !bg-[#e8eef7] !px-4 !text-[#0f172a] placeholder:!text-slate-500 !shadow-none !outline-none focus:!border-cyan-400 focus:!ring-2 focus:!ring-cyan-300/15",
    formButtonPrimary:
      "!h-9 !rounded-xl !bg-white !font-black !text-[#07111d] !shadow-none transition hover:!bg-cyan-50",
    footer: "!mt-4 !bg-transparent",
    footerPages: "hidden",
    footerPageLink: "hidden",
    footerAction: "!border-t !border-white/10 !pt-3.5",
    footerActionText: "!text-xs !text-slate-400",
    footerActionLink:
      "!text-xs !font-bold !text-cyan-300 hover:!text-cyan-200",
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
    <main className="relative min-h-screen overflow-x-hidden bg-black text-white lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-black" />

      <div className="relative mx-auto grid min-h-screen max-w-[1480px] lg:h-full lg:min-h-0 lg:grid-cols-[0.82fr_1.18fr]">
        <section className="relative flex min-h-screen flex-col border-white/10 px-5 py-5 sm:px-8 lg:h-full lg:min-h-0 lg:border-r lg:px-10 lg:py-6">
          <Link
            href="https://memoryo.dev"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to MemoryOS
          </Link>

          <div className="flex min-h-0 flex-1 items-center justify-center py-6 lg:py-2">
            <div className="w-full max-w-[374px] text-center">
              <div className="mx-auto flex w-fit items-center gap-2.5 text-sm font-black tracking-tight text-white">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white">
                  <img src="/brand/logo-mark.svg" alt="" className="size-6" />
                </span>
                MemoryOS
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-200">
                  Private beta
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[2.15rem]">
                {isSignUp
                  ? "Join the MemoryOS private beta"
                  : "Access the MemoryOS private beta"}
              </h1>
              <p className="mx-auto mt-2.5 max-w-sm text-sm leading-5 text-slate-400">
                {isSignUp
                  ? "Request access now. We’ll invite you when your workspace is ready."
                  : "Sign in if you’re approved, or join the waitlist for access."}
              </p>

              <div className="memoryos-auth-card mx-auto mt-4 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#0a111d] p-4 text-left text-white shadow-2xl shadow-black/20">
                {children}
              </div>
            </div>
          </div>
        </section>

        <section className="relative hidden h-full min-h-0 overflow-hidden bg-black p-5 lg:block xl:p-7">
          <AuthMemoryAnimation />
        </section>
      </div>
    </main>
  );
}
