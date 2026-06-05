"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import { BellRing, CheckCircle, DollarSign, Loader2, ShieldCheck, Zap } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { SettingsForm } from "@/components/settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDomainSchema } from "@/hooks/useDomainSchema";
import {
  displayApiError,
  type DomainSchemaValue,
  type SupportTypeMode,
  type SupportTypeValue,
  getTenantCostSummary,
  getTenantUsage,
  testTenantWebhook,
  updateTenantSupportType,
  updateTenantSettings,
} from "@/lib/api";

type SaveStatus = {
  tone: "success" | "error";
  message: string;
} | null;

const SUPPORT_TYPE_OPTIONS: Array<{ value: SupportTypeValue; label: string }> = [
  { value: "saas", label: "SaaS" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "banking_fintech", label: "Banking/Fintech" },
  { value: "travel", label: "Travel" },
  { value: "telecom", label: "Telecom" },
  { value: "edtech_support", label: "EdTech Support" },
  { value: "general_info", label: "General/Info" },
];

function DomainCard({
  active,
  badge,
  description,
  disabled,
  icon,
  loading,
  onClick,
  title,
}: {
  active: boolean;
  badge: string;
  description: string;
  disabled?: boolean;
  icon: string;
  loading?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      className={`relative rounded-2xl border-2 p-5 text-left transition ${
        active
          ? "border-sky-300 bg-sky-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={active ? "text-2xl" : "text-2xl opacity-80"}>{icon}</div>
          <div>
            <div className="font-semibold text-slate-950">{title}</div>
            <div className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
              {badge}
            </div>
          </div>
        </div>
        {loading ? (
          <Loader2 className="size-5 animate-spin text-sky-700" />
        ) : active ? (
          <CheckCircle className="size-5 text-sky-700" />
        ) : null}
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
    </button>
  );
}

export default function SettingsPage() {
  const { isLoaded, getToken } = useAuth();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
  const [switchingDomain, setSwitchingDomain] = useState<DomainSchemaValue | "general-pending" | null>(null);
  const [savingSupportType, setSavingSupportType] = useState(false);
  const domain = useDomainSchema();

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

  const errorMessage = displayApiError(usage.error);
  const costSummaryErrorMessage = displayApiError(costSummary.error);

  async function handleSave(changes: { alert_webhook_url?: string | null; overage_policy?: "block" | "warn" | "charge" }) {
    try {
      await updateTenantSettings(getToken, changes);
      setSaveStatus({ tone: "success", message: "Settings saved." });
    } catch (error) {
      setSaveStatus({
        tone: "error",
        message: displayApiError(error) ?? "Unable to save settings.",
      });
    }
  }

  async function handleTestWebhook(_timeoutMs: number) {
    void _timeoutMs;
    return testTenantWebhook(getToken);
  }

  async function handleDomainSwitch(nextDomain: DomainSchemaValue) {
    if (nextDomain === domain.domainSchema) {
      return;
    }

    const confirmed = window.confirm(
      nextDomain === "edtech"
        ? "Enable EdTech Schema?\n\nFuture add() calls will extract structured student memory. Existing general memories are kept - new sessions use EdTech extraction."
        : nextDomain === "support"
          ? "Enable Customer Support Schema?\n\nFuture add() calls will extract structured customer support memory. Existing general memories are kept."
          : "Switch to General Engine?\n\nYour existing domain memories will be kept but new add() calls will use general extraction. You can switch back anytime.",
    );
    if (!confirmed) {
      return;
    }

    setSwitchingDomain(nextDomain ?? "general-pending");
    setSaveStatus(null);
    try {
      await domain.setDomainSchema(nextDomain);
      setSaveStatus({
        tone: "success",
        message:
          nextDomain === "edtech"
            ? "EdTech Schema enabled."
            : nextDomain === "support"
              ? "Customer Support Schema enabled."
            : "General Engine enabled.",
      });
    } catch (error) {
      setSaveStatus({
        tone: "error",
        message: displayApiError(error) ?? "Unable to switch domain.",
      });
    } finally {
      setSwitchingDomain(null);
    }
  }

  async function saveSupportRouting(payload: {
    support_type: SupportTypeValue | null;
    support_type_mode: SupportTypeMode;
    support_types_allowed: SupportTypeValue[];
  }) {
    setSavingSupportType(true);
    setSaveStatus(null);
    try {
      await updateTenantSupportType(getToken, payload);
      await domain.mutate();
      setSaveStatus({ tone: "success", message: "Support routing saved." });
    } catch (error) {
      setSaveStatus({
        tone: "error",
        message: displayApiError(error) ?? "Unable to save support routing.",
      });
    } finally {
      setSavingSupportType(false);
    }
  }

  function handleSupportModeChange(mode: SupportTypeMode) {
    const fallbackSingle = domain.supportTypeConfigured ?? "saas";
    const fallbackAllowed = domain.supportTypesAllowed.length > 0
      ? domain.supportTypesAllowed
      : SUPPORT_TYPE_OPTIONS.map((option) => option.value);
    void saveSupportRouting({
      support_type: mode === "single" ? fallbackSingle : null,
      support_type_mode: mode,
      support_types_allowed: mode === "multi" ? fallbackAllowed : [],
    });
  }

  function handleSingleSupportTypeChange(supportType: SupportTypeValue) {
    void saveSupportRouting({
      support_type: supportType,
      support_type_mode: "single",
      support_types_allowed: [],
    });
  }

  function handleAllowedSupportTypeToggle(supportType: SupportTypeValue) {
    const current = domain.supportTypesAllowed;
    const next = current.includes(supportType)
      ? current.filter((item) => item !== supportType)
      : [...current, supportType];
    void saveSupportRouting({
      support_type: null,
      support_type_mode: "multi",
      support_types_allowed: next.length > 0 ? next : [supportType],
    });
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
          error={costSummaryErrorMessage}
          onRetry={() => void costSummary.mutate()}
        />
        <MetricCard
          title="Gate Savings"
          value={`$${costSummary.data?.savings_from_gate_usd.toFixed(4) ?? "0.0000"}`}
          description="Estimated savings from blocked calls"
          icon={BellRing}
          loading={costSummary.isLoading && !costSummary.data}
          error={costSummaryErrorMessage}
          onRetry={() => void costSummary.mutate()}
        />
      </section>

      <Card id="domain">
        <CardHeader>
          <CardTitle>Domain schema</CardTitle>
          <CardDescription>
            Choose the memory structure MemoryOS uses for future add() calls.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <DomainCard
              active={domain.domainSchema === null}
              icon="⚙️"
              title="General Engine"
              badge="Works for any domain"
              description="Generic facts, preferences, goals, procedures, relationships, and expertise for any AI product."
              loading={switchingDomain === "general-pending"}
              disabled={switchingDomain !== null || domain.isLoading}
              onClick={() => void handleDomainSwitch(null)}
            />
            <DomainCard
              active={domain.domainSchema === "edtech"}
              icon="🎓"
              title="EdTech Schema"
              badge="Structured student memory"
              description="Student profiles, weak topics, exam dates, learning style, and forgetting curve signals for education products."
              loading={switchingDomain === "edtech"}
              disabled={switchingDomain !== null || domain.isLoading}
              onClick={() => void handleDomainSwitch("edtech")}
            />
            <DomainCard
              active={domain.domainSchema === "support"}
              icon="CS"
              title="Customer Support Schema"
              badge="Structured customer memory"
              description="Customer identity, open issues, support history, sentiment risk, and support-type extension context."
              loading={switchingDomain === "support"}
              disabled={switchingDomain !== null || domain.isLoading}
              onClick={() => void handleDomainSwitch("support")}
            />
          </div>

          <div className="hidden">
            {[
              ["🏥", "HealthTech", "Coming Soon"],
              ["🌾", "AgriTech", "Coming Soon"],
              ["💼", "HR Tech", "Coming Soon"],
              ["🎧", "Support", "Coming Soon"],
            ].filter(([, name]) => name !== "Support").map(([icon, name, badge]) => (
              <div
                key={name}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 opacity-70"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xl" aria-hidden>
                    {icon}
                  </span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {badge}
                  </span>
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-800">{name}</div>
              </div>
            ))}
          </div>

          {domain.domainSchema === "support" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-semibold text-slate-950">
                How should MemoryOS classify support conversations?
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {[
                  ["single", "One fixed support type", "Best for SBI, Flipkart, MakeMyTrip style tenants."],
                  ["multi", "Multi-vertical helpdesk", "Best for Intercom, Crisp, Zendesk style tenants."],
                  ["auto", "Auto-detect all types", "Best while testing broad support coverage."],
                ].map(([value, label, description]) => (
                  <label
                    key={value}
                    className="flex gap-3 rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm text-slate-700"
                  >
                    <input
                      type="radio"
                      name="support_type_mode"
                      value={value}
                      checked={domain.supportTypeMode === value}
                      disabled={savingSupportType}
                      onChange={() => handleSupportModeChange(value as SupportTypeMode)}
                    />
                    <span>
                      <span className="block font-semibold text-slate-900">{label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
                    </span>
                  </label>
                ))}
              </div>

              {domain.supportTypeMode === "single" ? (
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                    Fixed support type
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {SUPPORT_TYPE_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        <input
                          type="radio"
                          name="support_type"
                          value={option.value}
                          checked={domain.supportTypeConfigured === option.value}
                          disabled={savingSupportType}
                          onChange={() => handleSingleSupportTypeChange(option.value)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {domain.supportTypeMode === "multi" ? (
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                    Allowed support types
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {SUPPORT_TYPE_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          value={option.value}
                          checked={domain.supportTypesAllowed.includes(option.value)}
                          disabled={savingSupportType}
                          onChange={() => handleAllowedSupportTypeToggle(option.value)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <p className="mt-3 text-sm text-slate-600">
                Single mode overrides detection. Multi mode detects per conversation only within selected types, so helpdesk platforms can serve many verticals safely.
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Switching changes future extraction only. Existing general memories
            and domain-specific memories are kept for audit and retrieval.
          </div>

          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Coming soon
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["HealthTech", "Coming Soon"],
                ["AgriTech", "Coming Soon"],
                ["HR Tech", "Coming Soon"],
              ].map(([name, badge]) => (
                <div
                  key={name}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 opacity-70"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-800">{name}</span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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
