"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const PERMISSION_OPTIONS = ["read", "write", "delete", "admin"] as const;

type CreateKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onSubmit: (payload: { name: string; permissions: string[] }) => Promise<void>;
};

export function CreateKeyDialog({
  open,
  onOpenChange,
  busy,
  onSubmit,
}: CreateKeyDialogProps) {
  const [name, setName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["read", "write"]);

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  function togglePermission(permission: string) {
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  }

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    await onSubmit({
      name: name.trim(),
      permissions: selectedPermissions,
    });
    setName("");
    setSelectedPermissions(["read", "write"]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API key</DialogTitle>
          <DialogDescription>
            Choose a display name and explicit permission scopes for the new key.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Production backend"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Permissions</div>
            <div className="grid grid-cols-2 gap-3">
              {PERMISSION_OPTIONS.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center gap-2 rounded-xl border border-border bg-muted/25 px-3 py-2 text-sm text-foreground transition hover:border-cyan-300/40 hover:bg-muted/45 has-[:checked]:border-cyan-400/50 has-[:checked]:bg-cyan-400/10"
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className="size-4 rounded border-border accent-cyan-400"
                  />
                  <span className="capitalize">{permission}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter showCloseButton>
          <Button className="bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={() => void handleSubmit()} disabled={busy || !canSubmit}>
            {busy ? "Creating..." : "Create key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
