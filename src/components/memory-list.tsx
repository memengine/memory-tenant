"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import type { MemoryRecord } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MemoryListProps = {
  memories: MemoryRecord[];
  loading: boolean;
  loadingMore: boolean;
  error?: string | null;
  hasMore: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
  onDeleteMemory: (memoryId: string) => Promise<void>;
};

function truncateContent(content: string): string {
  if (content.length <= 100) {
    return content;
  }
  return `${content.slice(0, 100)}...`;
}

function formatDate(value: string | null): string {
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

export function MemoryList({
  memories,
  loading,
  loadingMore,
  error,
  hasMore,
  onRetry,
  onLoadMore,
  onDeleteMemory,
}: MemoryListProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    if (!pendingDeleteId) {
      return;
    }
    setSubmitting(true);
    try {
      await onDeleteMemory(pendingDeleteId);
      setPendingDeleteId(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {loading ? (
        <div className="space-y-3">
          <div className="h-11 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-11 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-11 animate-pulse rounded-xl bg-slate-200" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-medium text-rose-800">{error}</div>
          <Button className="mt-3" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Importance</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memories.length > 0 ? (
                  memories.map((memory) => (
                    <TableRow key={memory.id}>
                      <TableCell className="max-w-xl text-sm text-slate-700">
                        {truncateContent(memory.content)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
                          {memory.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{memory.importance_score.toFixed(2)}</TableCell>
                      <TableCell className="text-slate-600">{formatDate(memory.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPendingDeleteId(memory.id)}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                      No memories available for this user yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {hasMore ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={onLoadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={Boolean(pendingDeleteId)} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete memory</DialogTitle>
            <DialogDescription>
              Remove this memory permanently from the user record?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={submitting}>
              {submitting ? "Deleting..." : "Delete memory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
