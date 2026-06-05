import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "MemoryOS Tenant Dashboard",
  description: "Tenant controls, usage, quality, and integration settings for MemoryOS.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased">
        <body className="min-h-screen bg-slate-100 text-slate-950">
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
