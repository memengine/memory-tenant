import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#050506] px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
        <FileQuestion className="size-7 text-slate-400" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Page not found
        </h1>
        <p className="max-w-md text-sm text-slate-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button asChild variant="outline" className="border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white">
        <Link href="/">Back to Overview</Link>
      </Button>
    </div>
  );
}
