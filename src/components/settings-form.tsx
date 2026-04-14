"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";

import type { TenantSettings, TenantUsage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SaveStatus = {
  tone: "success" | "error";
  message: string;
} | null;

type WebhookStatus = {
  tone: "success" | "error";
  message: string;
} | null;

type SettingsFormProps = {
  usage?: TenantUsage;
  saveStatus: SaveStatus;
  onSaveStatusClear: () => void;
  onSave: (changes: Partial<TenantSettings>) => Promise<void>;
  onTestWebhook: (timeoutMs: number) => Promise<{ delivered: boolean; status_code: number }>;
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function SettingsForm({
  usage,
  saveStatus,
  onSaveStatusClear,
  onSave,
  onTestWebhook,
}: SettingsFormProps) {
  const upgradeUrl = process.env.NEXT_PUBLIC_UPGRADE_URL;
  const [webhookUrl, setWebhookUrl] = useState("");
  const [overagePolicy, setOveragePolicy] = useState<TenantSettings["overage_policy"]>("warn");
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [baselineSettings, setBaselineSettings] = useState<TenantSettings>({
    alert_webhook_url: null,
    overage_policy: "warn",
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus>(null);

  useEffect(() => {
    const storedThreshold = window.localStorage.getItem("memoryos:tenant:alert-threshold");
    if (storedThreshold) {
      const parsed = Number(storedThreshold);
      if (!Number.isNaN(parsed)) {
        setAlertThreshold(parsed);
      }
    }
  }, []);

  const currentPlanName = useMemo(() => {
    if (!usage) {
      return "Loading...";
    }
    return usage.plan_tier.charAt(0).toUpperCase() + usage.plan_tier.slice(1);
  }, [usage]);

  async function handleSave() {
    setSaving(true);
    setWebhookStatus(null);
    onSaveStatusClear();

    try {
      const nextWebhookUrl = webhookUrl.trim() || null;
      const changes: Partial<TenantSettings> = {};

      if (nextWebhookUrl !== baselineSettings.alert_webhook_url) {
        changes.alert_webhook_url = nextWebhookUrl;
      }
      if (overagePolicy !== baselineSettings.overage_policy) {
        changes.overage_policy = overagePolicy;
      }

      if (Object.keys(changes).length > 0) {
        await onSave(changes);
      }
      setBaselineSettings({
        alert_webhook_url: nextWebhookUrl,
        overage_policy: overagePolicy,
      });
      window.localStorage.setItem("memoryos:tenant:alert-threshold", String(alertThreshold));
    } finally {
      setSaving(false);
    }
  }

  async function handleTestWebhook() {
    setTesting(true);
    setWebhookStatus(null);
    try {
      const result = await Promise.race([
        onTestWebhook(6_000),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("Timeout — webhook URL did not respond")), 6_000);
        }),
      ]);

      setWebhookStatus(
        result.delivered
          ? { tone: "success", message: `Delivered (${result.status_code})` }
          : { tone: "error", message: "Failed — check URL" },
      );
    } catch (error) {
      setWebhookStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed — check URL",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Tenant settings</CardTitle>
          <CardDescription>
            Configure alert delivery and overage behavior for this tenant workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3">
            <div>
              <div className="text-sm font-medium text-slate-900">Webhook URL</div>
              <div className="text-sm text-slate-500">
                MemoryOS sends operational tenant events here.
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={webhookUrl}
                onChange={(event) => setWebhookUrl(event.target.value)}
                placeholder="https://example.com/webhooks/memoryos"
              />
              <Button variant="outline" onClick={() => void handleTestWebhook()} disabled={testing}>
                <Link2 className="mr-2 size-4" />
                {testing ? "Testing..." : "Test Delivery"}
              </Button>
            </div>
            {webhookStatus ? (
              <div
                className={
                  webhookStatus.tone === "success"
                    ? "text-sm text-emerald-700"
                    : "text-sm text-rose-700"
                }
              >
                {webhookStatus.message}
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <div>
              <div className="text-sm font-medium text-slate-900">Overage Policy</div>
              <div className="text-sm text-slate-500">
                Choose how MemoryOS should behave when the monthly quota is exhausted.
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { value: "block", label: "Block" },
                { value: "warn", label: "Warn" },
                { value: "charge", label: "Charge" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    overagePolicy === option.value
                      ? "border-sky-300 bg-sky-50 text-sky-900"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="overage-policy"
                      value={option.value}
                      checked={overagePolicy === option.value}
                      onChange={() => setOveragePolicy(option.value as TenantSettings["overage_policy"])}
                    />
                    <span>{option.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-900">Alert Threshold</div>
                <div className="text-sm text-slate-500">
                  Local dashboard preference until backend threshold persistence is added.
                </div>
              </div>
              <div className="text-sm font-semibold text-slate-900">{alertThreshold}%</div>
            </div>
            <input
              type="range"
              min={50}
              max={95}
              value={alertThreshold}
              onChange={(event) => setAlertThreshold(Number(event.target.value))}
              className="w-full"
            />
          </section>

          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {saveStatus ? (
        <div
          className={
            saveStatus.tone === "success"
              ? "fixed bottom-6 right-6 z-50 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-lg"
              : "fixed bottom-6 right-6 z-50 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-lg"
          }
        >
          {saveStatus.message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>
            Read-only usage snapshot from the tenant quota envelope.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Plan</div>
            <div className="mt-2 text-2xl font-semibold text-slate-950">{currentPlanName}</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Call Limit</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">
                {usage?.calls_limit?.toLocaleString("en-IN") ?? "Unlimited"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Token Limit</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">
                {usage?.tokens_limit?.toLocaleString("en-IN") ?? "Unlimited"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Reset Date</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">
                {formatDateTime(usage?.reset_at ?? null)}
              </div>
            </div>
          </div>

          {upgradeUrl ? (
            <Button asChild className="w-full">
              <a href={upgradeUrl} target="_blank" rel="noreferrer">
                Upgrade Plan
                <ExternalLink className="ml-2 size-4" />
              </a>
            </Button>
          ) : (
            <Button className="w-full" disabled>
              Upgrade Plan unavailable
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
