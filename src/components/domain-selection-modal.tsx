"use client";

import { useState } from "react";
import { CheckCircle, Clock, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDomainSchema } from "@/hooks/useDomainSchema";
import { cn } from "@/lib/utils";

export const DOMAIN_SELECTION_STORAGE_KEY = "domain_selection_completed";

type DomainSelectionModalProps = {
  open: boolean;
  onClose: () => void;
  onNotice?: (message: string, tone: "success" | "info") => void;
  onSelected?: () => void;
};

const comingSoonDomains = [
  { icon: "🏥", name: "HealthTech", description: "Care plans and patient context" },
  { icon: "🌾", name: "AgriTech", description: "Crop, soil, and farm advisory memory" },
  { icon: "💼", name: "HR Tech", description: "Hiring and workforce context" },
  { icon: "🎧", name: "Support", description: "Customer support memory" },
].filter((domain) => domain.name !== "Support");

function markCompleted() {
  window.localStorage.setItem(DOMAIN_SELECTION_STORAGE_KEY, "true");
}

function OptionCard({
  accent,
  badge,
  bestFor,
  borderLabel,
  cta,
  description,
  disabled,
  icon,
  loading,
  onClick,
  preview,
  title,
}: {
  accent: "gray" | "blue" | "amber";
  badge: string;
  bestFor: string;
  borderLabel?: string;
  cta: string;
  description: string;
  disabled?: boolean;
  icon: string;
  loading?: boolean;
  onClick: () => void;
  preview: string[];
  title: string;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-2 bg-white shadow-sm transition-all",
        accent === "blue"
          ? "border-sky-300 shadow-sky-100"
          : accent === "amber"
            ? "border-amber-300 shadow-amber-100"
            : "border-slate-200",
      )}
    >
      {borderLabel ? (
        <div className="absolute right-4 top-4 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
          {borderLabel}
        </div>
      ) : null}
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-2xl text-2xl",
              accent === "blue" ? "bg-sky-100" : accent === "amber" ? "bg-amber-100" : "bg-slate-100",
            )}
            aria-hidden
          >
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
            <div
              className={cn(
                "mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                accent === "blue"
                  ? "bg-sky-100 text-sky-700"
                  : accent === "amber"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-700",
              )}
            >
              {badge}
            </div>
          </div>
        </div>

        <p className="text-sm leading-6 text-slate-600">{description}</p>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Best for
          </div>
          <p className="mt-2 text-sm text-slate-700">{bestFor}</p>
        </div>

        <div
          className={cn(
            "space-y-2 rounded-2xl p-4 text-sm",
            accent === "blue"
              ? "bg-sky-50 text-sky-900"
              : accent === "amber"
                ? "bg-amber-50 text-amber-950"
                : "bg-slate-50 text-slate-700",
          )}
        >
          {preview.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle className="size-3.5 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <Button
          className="w-full"
          variant={accent === "gray" ? "outline" : "default"}
          onClick={onClick}
          disabled={disabled || loading}
        >
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {cta}
        </Button>
      </CardContent>
    </Card>
  );
}

export function DomainSelectionModal({
  open,
  onClose,
  onNotice,
  onSelected,
}: DomainSelectionModalProps) {
  const { setDomainSchema } = useDomainSchema();
  const [loading, setLoading] = useState<"general" | "edtech" | "support" | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);

  if (!open) {
    return null;
  }

  function closeAfterSelection(message?: string) {
    markCompleted();
    onClose();
    onSelected?.();
    if (message) {
      onNotice?.(message, "success");
    }
  }

  async function chooseGeneral() {
    setLoading("general");
    markCompleted();
    setLoading(null);
    onClose();
    onSelected?.();
    onNotice?.(
      "General Engine active. Your AI can store memory for any use case.",
      "success",
    );
  }

  async function chooseEdTech() {
    setLoading("edtech");
    setNotice(null);
    try {
      await setDomainSchema("edtech");
      closeAfterSelection("EdTech Schema enabled. Student memory will be structured automatically.");
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to enable EdTech Schema.",
      });
    } finally {
      setLoading(null);
    }
  }

  async function chooseSupport() {
    setLoading("support");
    setNotice(null);
    try {
      await setDomainSchema("support");
      closeAfterSelection("Customer Support Schema enabled. Customer memory will be structured automatically.");
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to enable Customer Support Schema.",
      });
    } finally {
      setLoading(null);
    }
  }

  function comingSoon(name: string) {
    setNotice({
      tone: "info",
      message: `${name} is coming soon. We will notify you when it is available.`,
    });
  }

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/30 p-4 backdrop-blur-md sm:p-8"
    >
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-2xl sm:p-8">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-semibold text-white">
            M
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              What are you building?
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Choose how MemoryOS structures memory for your AI product. You can
              change this later in Settings.
            </p>
          </div>
        </header>

        {notice ? (
          <div
            className={cn(
              "mx-auto mt-5 max-w-2xl rounded-2xl border px-4 py-3 text-sm",
              notice.tone === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : notice.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-sky-200 bg-sky-50 text-sky-800",
            )}
          >
            {notice.message}
          </div>
        ) : null}

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <OptionCard
            accent="gray"
            icon="⚙️"
            title="General Engine"
            badge="Works for any domain"
            description="Extracts facts, preferences, goals, expertise, and procedures from any conversation. No industry-specific structure."
            bestFor="Developer tools, productivity apps, general assistants, custom use cases"
            preview={[
              "user prefers Python",
              "user is building a SaaS product",
              "user works remotely",
            ]}
            cta="Start with General Engine"
            loading={loading === "general"}
            disabled={loading !== null}
            onClick={() => void chooseGeneral()}
          />
          <OptionCard
            accent="blue"
            icon="🎓"
            title="EdTech Schema"
            badge="Structured student memory"
            borderLabel="Most structured"
            description="Structured memory for tutoring and education AI. Automatically extracts grade level, weak topics, exam dates, learning styles, and forgetting curves."
            bestFor="AI tutors, study assistants, exam prep, learning platforms"
            preview={[
              "Student weak in integration (severe)",
              "CBSE Class 12 | Exam in 34 days",
              "Learns via worked examples",
            ]}
            cta="Use EdTech Schema"
            loading={loading === "edtech"}
            disabled={loading !== null}
            onClick={() => void chooseEdTech()}
          />
          <OptionCard
            accent="amber"
            icon="CS"
            title="Customer Support Schema"
            badge="Structured customer memory"
            description="Tracks account context, open issues, support history, resolution preferences, and support-type-specific signals."
            bestFor="Support chatbots, help desks, CRM AI, customer service automation"
            preview={[
              "Order ORD-44821 delayed - resolved via reship",
              "Prefers direct communication",
              "High value customer since 2023",
            ]}
            cta="Use Support Schema"
            loading={loading === "support"}
            disabled={loading !== null}
            onClick={() => void chooseSupport()}
          />
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {comingSoonDomains.map((domain) => (
            <button
              key={domain.name}
              type="button"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left opacity-75 transition hover:bg-slate-100"
              onClick={() => comingSoon(domain.name)}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-2xl" aria-hidden>
                  {domain.icon}
                </span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  Coming Soon
                </span>
              </div>
              <div className="mt-3 font-semibold text-slate-800">{domain.name}</div>
              <p className="mt-1 text-sm leading-5 text-slate-500">{domain.description}</p>
            </button>
          ))}
        </section>

        <footer className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-5 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-sky-600" />
            Not sure? Start with General Engine. You can switch anytime.
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
            onClick={() => {
              markCompleted();
              onClose();
            }}
          >
            <Clock className="size-4" />
            Skip for now -&gt;
          </button>
        </footer>
      </div>
    </div>
  );
}
