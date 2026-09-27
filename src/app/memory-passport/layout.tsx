import type { ReactNode } from "react";

import { MemoryPassportFeatureGate } from "@/components/memory-passport-feature-gate";

export default function MemoryPassportLayout({ children }: { children: ReactNode }) {
  return <MemoryPassportFeatureGate>{children}</MemoryPassportFeatureGate>;
}
