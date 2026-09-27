import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { memoryPassportEnabled } from "@/lib/features";

export function MemoryPassportFeatureGate({ children }: { children: ReactNode }) {
  if (!memoryPassportEnabled) {
    notFound();
  }

  return children;
}
