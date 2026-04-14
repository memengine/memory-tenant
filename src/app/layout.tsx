import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "MemoryOS Tenant Dashboard",
  description: "Tenant controls, usage, quality, and integration settings for MemoryOS.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId, orgId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased">
        <body className="min-h-screen bg-slate-100 text-slate-950">
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="min-w-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 pt-20 sm:px-6 md:pt-6 lg:px-8">
                {!orgId ? (
                  <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Select your Clerk organization from the sidebar switcher to load tenant data.
                  </div>
                ) : null}
                {children}
              </div>
            </main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
