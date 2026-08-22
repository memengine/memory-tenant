import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { AuthLiquidArtwork } from "@/components/auth-liquid-artwork";

type AuthShellProps = {
  children: React.ReactNode;
  mode: "sign-in" | "sign-up";
};

export const authAppearance = {
  variables: {
    colorPrimary: "#f8fafc",
    colorBackground: "#0a0a0b",
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
      "!h-12 !rounded-full !border !border-white/10 !bg-white/[0.06] !text-white !shadow-none transition hover:!border-white/20 hover:!bg-white/[0.1]",
    socialButtonsBlockButtonText: "!font-semibold !text-slate-200",
    formFieldInput:
      "!h-12 !rounded-full !border !border-white/15 !bg-white/[0.04] !px-5 !text-white placeholder:!text-slate-500 !shadow-none !outline-none focus:!border-white/35 focus:!ring-4 focus:!ring-white/[0.04]",
    formButtonPrimary:
      "!h-12 !rounded-full !bg-white !font-black !text-black !shadow-none transition hover:!bg-slate-200",
    footer: "!mt-4 !bg-transparent",
    footerPages: "hidden",
    footerPageLink: "hidden",
    footerAction: "!border-t !border-white/10 !pt-3.5",
    footerActionText: "!text-xs !text-slate-400",
    footerActionLink:
      "!text-xs !font-bold !text-white hover:!text-slate-300",
    developmentModeBadge: "hidden",
    dividerLine: "!bg-white/10",
    dividerText: "!text-slate-500",
    formFieldLabel: "!text-xs !font-semibold !text-slate-300",
    formFieldInputShowPasswordButton: "!text-slate-500 hover:!text-slate-200",
    formFieldAction: "!text-white hover:!text-slate-300",
    formFieldSuccessText: "!text-emerald-300",
    formFieldErrorText: "!text-rose-300",
    alert: "!rounded-xl !border !border-rose-400/20 !bg-rose-400/10 !text-rose-200",
    formResendCodeLink: "!text-white hover:!text-slate-300",
    otpCodeFieldInput:
      "!h-12 !rounded-full !border !border-white/15 !bg-white/[0.04] !text-white",
    identityPreviewText: "!text-white",
  },
};

export function AuthShell({ children, mode }: AuthShellProps) {
  const isSignUp = mode === "sign-up";

  return (
    <main className="min-h-screen bg-black p-2 text-white lg:h-dvh lg:overflow-hidden">
      <div className="mx-auto grid min-h-[calc(100vh-1rem)] max-w-[1900px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-black shadow-[0_24px_90px_rgba(0,0,0,0.35)] lg:h-[calc(100vh-1rem)] lg:grid-cols-2">
        <div className="hidden min-h-0 p-0 lg:block">
          <AuthLiquidArtwork />
        </div>

        <section className="relative flex min-h-[calc(100vh-1rem)] items-center justify-center border-white/10 bg-[#050506] px-6 py-20 sm:px-10 lg:min-h-0 lg:border-l lg:px-16">
          <Link
            href="https://memoryo.dev"
            className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to MemoryOS
          </Link>

          <div className="w-full max-w-[400px] text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white shadow-sm">
                <Image src="/brand/logo-mark.svg" alt="" width={30} height={30} />
              </span>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">MemoryOS private beta</p>
              <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-[-0.045em]">
                {isSignUp
                  ? "Request access"
                  : "Welcome back"}
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
                {isSignUp
                  ? "Request access now. We’ll invite you when your workspace is ready."
                  : "Sign in to your governed memory workspace."}
              </p>

              <div className="memoryos-auth-card mx-auto mt-8 text-left text-white">
                {children}
              </div>
          </div>
        </section>
      </div>
    </main>
  );
}
