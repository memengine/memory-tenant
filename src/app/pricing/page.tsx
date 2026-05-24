import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { BillingToggle } from "@/components/billing-toggle";
import { ComparisonTable } from "@/components/comparison-table";
import { CrossAgentAddons } from "@/components/cross-agent-addons";
import { PricingFaq } from "@/components/pricing-faq";
import type { BillingPlan } from "@/components/plan-card";

const FALLBACK_PLANS: BillingPlan[] = [
  {
    name: "free",
    display_name: "Free",
    badge: "Always Free",
    monthly_price_inr: 0,
    annual_price_inr: 0,
    monthly_price_usd: 0,
    annual_price_usd: 0,
    is_popular: false,
    cta_text: "Start for free",
    cta_type: "signup",
    limits: {
      monthly_call_limit: 5000,
      write_call_limit: 5000,
      read_limit: null,
      rate_limit_per_user_per_minute: 3,
      overage_policy: "block",
      overage_policy_label: "API pauses when limit reached",
    },
    features: {
      quality_gate: true,
      domain_schemas: false,
      cross_agent: false,
      audit_log_days: 0,
      support: "Community",
      sla: "Best effort",
      data_residency: "IN1 only",
    },
  },
  {
    name: "starter",
    display_name: "Starter",
    badge: "Most Popular",
    monthly_price_inr: 999,
    annual_price_inr: 9990,
    monthly_price_usd: 12,
    annual_price_usd: 120,
    is_popular: true,
    cta_text: "Upgrade to Starter",
    cta_type: "checkout",
    limits: {
      monthly_call_limit: 50000,
      write_call_limit: 50000,
      read_limit: null,
      rate_limit_per_user_per_minute: 10,
      overage_policy: "warn",
      overage_policy_label: "AI continues without memory context",
    },
    features: {
      quality_gate: true,
      domain_schemas: false,
      cross_agent: false,
      audit_log_days: 30,
      support: "Email (48h SLA)",
      sla: "99.5%",
      data_residency: "IN1 only",
    },
  },
  {
    name: "growth",
    display_name: "Growth",
    badge: "Scale Up",
    monthly_price_inr: 3999,
    annual_price_inr: 39990,
    monthly_price_usd: 48,
    annual_price_usd: 480,
    is_popular: false,
    cta_text: "Upgrade to Growth",
    cta_type: "checkout",
    limits: {
      monthly_call_limit: 500000,
      write_call_limit: 500000,
      read_limit: null,
      rate_limit_per_user_per_minute: 30,
      overage_policy: "warn",
      overage_policy_label: "AI continues without memory context",
    },
    features: {
      quality_gate: true,
      domain_schemas: true,
      cross_agent: true,
      audit_log_days: 90,
      support: "Email (24h SLA)",
      sla: "99.9%",
      data_residency: "IN1 only",
    },
  },
  {
    name: "enterprise",
    display_name: "Enterprise",
    badge: "Unlimited",
    monthly_price_inr: null,
    annual_price_inr: null,
    monthly_price_usd: null,
    annual_price_usd: null,
    is_popular: false,
    cta_text: "Talk to Sales",
    cta_type: "sales",
    limits: {
      monthly_call_limit: null,
      write_call_limit: null,
      read_limit: null,
      rate_limit_per_user_per_minute: null,
      overage_policy: null,
      overage_policy_label: null,
    },
    features: {
      quality_gate: true,
      domain_schemas: true,
      cross_agent: true,
      audit_log_days: 365,
      support: "Dedicated Slack",
      sla: "99.99%",
      data_residency: "Choose region",
    },
  },
];

async function getPlans(): Promise<BillingPlan[]> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE;
  if (!apiBase) {
    return FALLBACK_PLANS;
  }

  try {
    const response = await fetch(`${apiBase}/v1/billing/plans`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return FALLBACK_PLANS;
    }
    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as BillingPlan[]) : FALLBACK_PLANS;
  } catch {
    return FALLBACK_PLANS;
  }
}

export default async function PricingPage() {
  const { userId } = await auth();
  const isLoggedIn = !!userId;
  const plans = await getPlans();

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-white">
      <section className="bg-[#0D1117] px-4 pb-16 pt-20 text-white sm:px-6 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex rounded-full border border-[#2E75B6]/50 bg-[#0B1D32]/70 px-4 py-1.5 text-sm font-medium text-sky-100">
            Simple, transparent pricing ✨
          </div>
          <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-6xl">
            <span className="block text-white">The Memory Layer for AI</span>
            <span className="block text-slate-400">Pay only for what you use</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
            Add persistent memory to your AI product in 5 minutes. Free tier
            included. No credit card required.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#2E75B6] px-6 text-sm font-semibold text-white transition hover:bg-[#25639b]"
            >
              Start for free
            </Link>
            <a
              href="mailto:sales@memoryos.io"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[#30363D] bg-transparent px-6 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
            >
              Talk to Sales
            </a>
          </div>
        </div>
      </section>

      <section className="border-y border-[#30363D] bg-[#161B22] px-4 py-4 text-slate-400 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl snap-x gap-6 overflow-x-auto text-sm md:justify-center md:overflow-visible">
          {["10M+ Memories Stored", "5 Domain Schemas", "99.9% Uptime", "Loved by developers 🧑‍💻"].map(
            (item, index) => (
              <div
                key={item}
                className={`shrink-0 snap-start pr-6 ${
                  index === 3 ? "" : "border-r border-[#30363D]"
                }`}
              >
                {item}
              </div>
            ),
          )}
        </div>
      </section>

      <BillingToggle plans={plans} isLoggedIn={isLoggedIn} />
      <CrossAgentAddons />
      <ComparisonTable />
      <PricingFaq />

      <section className="bg-[#0D1117] px-4 py-20 text-center text-white sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Start building in 5 minutes
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400">
          Join developers building smarter AI products with MemoryOS.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/sign-up"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-[#2E75B6] px-6 text-sm font-semibold text-white transition hover:bg-[#25639b]"
          >
            Start for free
          </Link>
          <a
            href="https://memoryengine.mintlify.app"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-[#30363D] px-6 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
          >
            Read the docs
          </a>
        </div>
      </section>
    </div>
  );
}
