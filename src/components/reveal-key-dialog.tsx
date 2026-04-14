"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RevealKeyDialogProps = {
  open: boolean;
  rawKey: string | null;
  onOpenChange: (open: boolean) => void;
  onCloseComplete: () => void;
};

export function RevealKeyDialog({
  open,
  rawKey,
  onOpenChange,
  onCloseComplete,
}: RevealKeyDialogProps) {
  const [copiedConfirmed, setCopiedConfirmed] = useState(false);

  async function handleCopy() {
    if (!rawKey) {
      return;
    }
    await navigator.clipboard.writeText(rawKey);
  }

  function handleClose() {
    onOpenChange(false);
    onCloseComplete();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !copiedConfirmed) {
          return;
        }
        if (!nextOpen) {
          setCopiedConfirmed(false);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        onInteractOutside={(event) => {
          if (!copiedConfirmed) {
            event.preventDefault();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (!copiedConfirmed) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Copy this API key now</DialogTitle>
          <DialogDescription>
            This raw key will be shown only once. After this dialog closes, it cannot be recovered.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-mono text-sm break-all text-emerald-950">
            {rawKey}
          </div>

          <Button variant="outline" onClick={() => void handleCopy()} disabled={!rawKey}>
            <Copy className="mr-2 size-4" />
            Copy
          </Button>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={copiedConfirmed}
              onChange={(event) => setCopiedConfirmed(event.target.checked)}
              className="size-4 rounded border-slate-300"
            />
            <span>I have copied this key</span>
          </label>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} disabled={!copiedConfirmed}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
