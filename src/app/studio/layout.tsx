import type { ReactNode } from "react";

import { MemoryPassportFeatureGate } from "@/components/memory-passport-feature-gate";

export default function PassportStudioLayout({ children }: { children: ReactNode }) {
  return <MemoryPassportFeatureGate>{children}</MemoryPassportFeatureGate>;
}
