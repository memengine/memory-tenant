"use client";

import { useAuth, useOrganization, useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getDashboardToken } from "@/lib/api";

const PAID_PLANS = new Set(["starter", "growth", "scale"]);
const BILLING_INTERVALS = new Set(["monthly", "annual"]);

type RazorpayResult = { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string };
type RazorpayCheckout = { open: () => void; on: (event: "payment.failed", callback: () => void) => void };

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.memoryosRazorpay = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Secure checkout could not load."));
    document.head.appendChild(script);
  });
}

export default function BillingCheckoutPage() {
  const { isLoaded: isAuthLoaded, getToken } = useAuth();
  const { isLoaded: isOrganizationLoaded, organization } = useOrganization();
  const { user } = useUser();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoaded || !isOrganizationLoaded || started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan") ?? "";
    const billing = params.get("billing") ?? "monthly";
    if (!PAID_PLANS.has(plan) || !BILLING_INTERVALS.has(billing)) {
      setError("This billing selection is invalid. Return to pricing and choose a plan again.");
      return;
    }
    if (!organization) {
      const target = `/billing/checkout?plan=${plan}&billing=${billing}&currency=inr`;
      window.location.replace(`/onboarding?redirect_url=${encodeURIComponent(target)}`);
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_BASE;
    if (!apiBase) {
      setError("Billing is not configured for this deployment.");
      return;
    }

    async function beginCheckout() {
      try {
        const token = await getDashboardToken(getToken);
        if (!token) throw new Error("Your session could not be verified. Please sign in again.");
        const response = await fetch(`${apiBase}/v1/billing/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ plan_tier: plan, billing_interval: billing, currency: "inr" }),
        });
        const payload = (await response.json()) as { data?: { key_id: string; subscription_id: string; checkout_url: string }; error?: string };
        if (!response.ok || !payload.data) throw new Error(payload.error || "Unable to create checkout.");
        await loadRazorpay();
        if (!window.Razorpay) {
          window.location.assign(payload.data.checkout_url);
          return;
        }
        const checkout = new window.Razorpay({
          key: payload.data.key_id,
          subscription_id: payload.data.subscription_id,
          name: "MemoryOS",
          description: `${plan} plan, billed ${billing}`,
          prefill: { name: user?.fullName ?? "", email: user?.primaryEmailAddress?.emailAddress ?? "" },
          theme: { color: "#2E75B6" },
          modal: { ondismiss: () => setError("Checkout was closed before payment completed.") },
          handler: async (result: RazorpayResult) => {
            const verifyToken = await getDashboardToken(getToken);
            if (!verifyToken) throw new Error("Your session expired during checkout.");
            const verified = await fetch(`${apiBase}/v1/billing/checkout/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${verifyToken}` },
              body: JSON.stringify(result),
            });
            if (!verified.ok) {
              setError("Payment completed, but verification is pending. Contact support before retrying.");
              return;
            }
            window.location.assign(`/billing/success?plan=${plan}`);
          },
        });
        checkout.on("payment.failed", () => setError("Payment failed. You were not upgraded; please try again."));
        checkout.open();
      } catch (checkoutError) {
        setError(checkoutError instanceof Error ? checkoutError.message : "Unable to create checkout.");
      }
    }
    void beginCheckout();
  }, [getToken, isAuthLoaded, isOrganizationLoaded, organization, user]);

  return (
    <div className="relative left-1/2 flex min-h-screen w-screen -translate-x-1/2 items-center justify-center bg-[#0D1117] px-4 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-[#30363D] bg-[#161B22] p-8 text-center">
        {error ? <><h1 className="text-2xl font-bold">Checkout not completed</h1><p className="mt-3 text-sm leading-6 text-slate-400">{error}</p><button className="mt-6 rounded-xl bg-[#2E75B6] px-5 py-3 text-sm font-semibold" onClick={() => window.location.reload()}>Try again</button></> : <><Loader2 className="mx-auto size-12 animate-spin text-[#2E75B6]" /><h1 className="mt-6 text-2xl font-bold">Preparing secure checkout…</h1><p className="mt-3 text-sm text-slate-400">Payment will open securely through Razorpay.</p></>}
      </div>
    </div>
  );
}
