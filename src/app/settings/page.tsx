"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import { BellRing, DollarSign, ShieldCheck, Zap } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { SettingsForm } from "@/components/settings-form";
import {
  ApiRequestError,
  getTenantCostSummary,
  getTenantUsage,
  testTenantWebhook,
  updateTenantSettings,
} from "@/lib/api";

type SaveStatus = {
  tone: "success" | "error";
  message: string;
} | null;

export default function SettingsPage() {
  const { isLoaded, getToken } = useAuth();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);

  const usage = useSWR(
    isLoaded ? "tenant-usage-settings" : null,
    () => getTenantUsage(getToken),
    { refreshInterval: 30_000 },
  );

  const costSummary = useSWR(
    isLoaded ? "tenant-cost-summary-settings" : null,
    () => getTenantCostSummary(getToken),
    { refreshInterval: 30_000 },
  );

  const errorMessage = (usage.error as ApiRequestError | undefined)?.message;

  async function handleSave(changes: { alert_webhook_url?: string | null; overage_policy?: "block" | "warn" | "charge" }) {
    try {
      await updateTenantSettings(getToken, changes);
      setSaveStatus({ tone: "success", message: "Settings saved." });
    } catch (error) {
      setSaveStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to save settings.",
      });
    }
  }

  async function handleTestWebhook(_timeoutMs: number) {
    void _timeoutMs;
    return testTenantWebhook(getToken);
  }

  return (
    <div className="flex flex-col gap-6 pt-14 md:pt-0">
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
          Settings
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Tenant controls
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          Configure alerts, review plan status, and keep your tenant integration aligned with usage.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Plan"
          value={usage.data ? usage.data.plan_tier.toUpperCase() : "Loading"}
          description="Current tenant plan tier"
          icon={ShieldCheck}
          loading={usage.isLoading && !usage.data}
          error={errorMessage}
          onRetry={() => void usage.mutate()}
        />
        <MetricCard
          title="Calls Used"
          value={usage.data ? usage.data.calls_used.toLocaleString("en-IN") : "0"}
          description="Current month request volume"
          icon={Zap}
          loading={usage.isLoading && !usage.data}
          error={errorMessage}
          onRetry={() => void usage.mutate()}
        />
        <MetricCard
          title="Estimated Cost"
          value={`$${costSummary.data?.estimated_cost_usd.toFixed(4) ?? "0.0000"}`}
          description="Month-to-date cost estimate"
          icon={DollarSign}
          loading={costSummary.isLoading && !costSummary.data}
          error={(costSummary.error as ApiRequestError | undefined)?.message}
          onRetry={() => void costSummary.mutate()}
        />
        <MetricCard
          title="Gate Savings"
          value={`$${costSummary.data?.savings_from_gate_usd.toFixed(4) ?? "0.0000"}`}
          description="Estimated savings from blocked calls"
          icon={BellRing}
          loading={costSummary.isLoading && !costSummary.data}
          error={(costSummary.error as ApiRequestError | undefined)?.message}
          onRetry={() => void costSummary.mutate()}
        />
      </section>

      <SettingsForm
        usage={usage.data}
        saveStatus={saveStatus}
        onSaveStatusClear={() => setSaveStatus(null)}
        onSave={handleSave}
        onTestWebhook={handleTestWebhook}
      />
    </div>
  );
}
