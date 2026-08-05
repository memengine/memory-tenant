"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

interface ToastNotificationProps {
  message: string | null;
  tone?: "success" | "error" | "info";
  /** Auto-dismiss after this many ms. Defaults to 4000. Pass 0 to disable. */
  duration?: number;
  onDismiss?: () => void;
}

export function ToastNotification({
  message,
  tone = "success",
  duration = 4000,
  onDismiss,
}: ToastNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    setVisible(true);
    if (duration <= 0) return;
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => window.clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!visible || !message) return null;

  const styles =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : tone === "info"
        ? "border-sky-200 bg-sky-50 text-sky-900"
        : "border-emerald-200 bg-emerald-50 text-emerald-900";

  const Icon = tone === "error" ? XCircle : CheckCircle2;
  const iconStyles =
    tone === "error"
      ? "text-rose-500"
      : tone === "info"
        ? "text-sky-500"
        : "text-emerald-500";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg ${styles}`}
    >
      <Icon className={`size-4 shrink-0 ${iconStyles}`} />
      <span>{message}</span>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => { setVisible(false); onDismiss(); }}
          className="ml-1 opacity-60 hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
