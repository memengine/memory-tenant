"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle2, Loader2 } from "lucide-react";

type SubscriptionPayload = {
  plan_tier?: "free" | "starter" | "growth" | "enterprise";
  limits?: {
    monthly_call_limit?: number | null;
    write_call_limit?: number | null;
    rate_limit_per_user_per_minute?: number | null;
  };
  data?: {
    plan_tier?: "free" | "starter" | "growth" | "enterprise";
    limits?: {
      monthly_call_limit?: number | null;
      write_call_limit?: number | null;
      rate_limit_per_user_per_minute?: number | null;
    };
  };
};

type SubscriptionState = {
  plan_tier: "free" | "starter" | "growth" | "enterprise";
  limits?: {
    monthly_call_limit?: number | null;
    write_call_limit?: number | null;
    rate_limit_per_user_per_minute?: number | null;
  };
};

function normalizeSubscription(payload: SubscriptionPayload): SubscriptionState | null {
  const planTier = payload.plan_tier ?? payload.data?.plan_tier;
  if (!planTier) {
    return null;
  }
  return {
    plan_tier: planTier,
    limits: payload.limits ?? payload.data?.limits,
  };
}

function formatLimit(value: number | null | undefined): string {
  if (value === null) {
    return "Unlimited";
  }
  if (value === undefined) {
    return "Active";
  }
  return value.toLocaleString("en-IN");
}

export default function BillingSuccessPage() {
  const { isLoaded, getToken } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "timeout">("loading");
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const initialPlanRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE;
    if (!apiBase) {
      window.setTimeout(() => setStatus("timeout"), 0);
      return;
    }

    let cancelled = false;
    let elapsed = 0;

    async function pollSubscription() {
      try {
        const token = await getToken();
        const response = await fetch(`${apiBase}/v1/billing/subscription`, {
          cache: "no-store",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (response.ok) {
          const nextSubscription = normalizeSubscription(
            (await response.json()) as SubscriptionPayload,
          );
          if (nextSubscription) {
            if (initialPlanRef.current === null) {
              initialPlanRef.current = nextSubscription.plan_tier;
            } else if (nextSubscription.plan_tier !== initialPlanRef.current) {
              setSubscription(nextSubscription);
              setStatus("success");
              return;
            }
          }
        }
      } catch {
        // Keep polling until the timeout window closes.
      }

      elapsed += 3;
      if (!cancelled && elapsed >= 30) {
        setStatus("timeout");
      } else if (!cancelled) {
        window.setTimeout(pollSubscription, 3000);
      }
    }

    void pollSubscription();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded]);

  return (
    <div className="relative left-1/2 flex min-h-screen w-screen -translate-x-1/2 items-center justify-center bg-[#0D1117] px-4 py-16 text-white">
      <div className="w-full max-w-xl rounded-2xl border border-[#30363D] bg-[#161B22] p-8 text-center shadow-2xl shadow-black/20">
        {status === "loading" ? (
          <>
            <Loader2 className="mx-auto size-12 animate-spin text-[#2E75B6]" />
            <h1 className="mt-6 text-2xl font-bold">Activating your plan...</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Stripe confirmed the checkout. MemoryOS is syncing your new limits.
            </p>
          </>
        ) : status === "success" && subscription ? (
          <>
            <CheckCircle2 className="mx-auto size-14 text-emerald-400" />
            <h1 className="mt-6 text-3xl font-bold capitalize">
              Welcome to {subscription.plan_tier}!
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Your new limits are now active.
            </p>
            <div className="mt-8 grid gap-3 rounded-2xl border border-[#30363D] bg-[#0D1117] p-5 text-left text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Monthly calls</span>
                <span className="font-semibold text-white">
                  {formatLimit(subscription.limits?.monthly_call_limit)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Write calls</span>
                <span className="font-semibold text-white">
                  {formatLimit(subscription.limits?.write_call_limit)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Rate limit</span>
                <span className="font-semibold text-white">
                  {subscription.limits?.rate_limit_per_user_per_minute === null
                    ? "Custom"
                    : `${formatLimit(subscription.limits?.rate_limit_per_user_per_minute)} calls/user/min`}
                </span>
              </div>
            </div>
            <Link
              href="/"
              className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-[#2E75B6] px-5 text-sm font-semibold text-white transition hover:bg-[#25639b]"
            >
              Go to Dashboard
            </Link>
          </>
        ) : (
          <>
            <CheckCircle2 className="mx-auto size-14 text-emerald-400" />
            <h1 className="mt-6 text-2xl font-bold">Your payment was received.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              It may take a few minutes to activate. Refresh your dashboard shortly.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-[#2E75B6] px-5 text-sm font-semibold text-white transition hover:bg-[#25639b]"
            >
              Go to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
