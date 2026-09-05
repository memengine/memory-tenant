"use client";

import { OrganizationList } from "@clerk/nextjs";

function safeReturnUrl(): string {
  if (typeof window === "undefined") return "/";
  const requested = new URLSearchParams(window.location.search).get("redirect_url");
  return requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
}

export default function OnboardingPage() {
  const returnUrl = safeReturnUrl();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050506] px-4 py-12 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">MemoryOS workspace</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Choose or create your workspace</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Your subscription must belong to a workspace. Payment starts only after one is active.
        </p>
        <div className="mt-8 flex justify-center">
          <OrganizationList
            hidePersonal
            afterSelectOrganizationUrl={returnUrl}
            afterCreateOrganizationUrl={returnUrl}
          />
        </div>
      </section>
    </main>
  );
}
