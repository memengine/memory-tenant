"use client";

import { useState } from "react";

import { PlanCard, type BillingInterval, type BillingPlan } from "@/components/plan-card";

type BillingToggleProps = {
  plans: BillingPlan[];
  isLoggedIn: boolean;
};

export function BillingToggle({ plans, isLoggedIn }: BillingToggleProps) {
  const [billing, setBilling] = useState<BillingInterval>("monthly");

  return (
    <section className="bg-[#0D1117] px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex items-center rounded-full border border-[#30363D] bg-[#161B22] p-1">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                billing === "monthly"
                  ? "bg-[#2E75B6] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                billing === "annual"
                  ? "bg-[#2E75B6] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Annual
            </button>
          </div>
          <div className="text-sm font-medium text-emerald-300">
            Save 2 months →
          </div>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.name}
              billing={billing}
              isLoggedIn={isLoggedIn}
              plan={plan}
              className={plan.is_popular ? "order-first md:order-none" : ""}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
