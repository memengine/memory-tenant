import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "MemoryOS Tenant Dashboard",
  description: "Tenant controls, usage, quality, and integration settings for MemoryOS.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark h-full antialiased">
        <body className="min-h-screen bg-[#050506] text-slate-100">
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
