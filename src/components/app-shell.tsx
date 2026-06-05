"use client";

import { useOrganization } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { organization } = useOrganization();
  const isAuthRoute =
    pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 pt-20 sm:px-6 md:pt-6 lg:px-8">
          {!organization ? (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Select or create a workspace from the sidebar to load your tenant
              data.
            </div>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}
