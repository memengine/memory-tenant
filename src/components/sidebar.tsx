"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  Activity,
  Brain,
  KeyRound,
  LayoutDashboard,
  Menu,
  Sparkles,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/memories", label: "Memories", icon: Brain },
  { href: "/playground", label: "Playground", icon: Sparkles },
  { href: "/users", label: "Users", icon: Users },
  { href: "/quality-log", label: "Quality Log", icon: ShieldAlert },
  { href: "/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1.5">
      {navItems.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sky-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarRail() {
  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white">
          M
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-950">MemoryOS</div>
          <div className="text-xs text-slate-500">Tenant Dashboard</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between px-4 py-5">
        <SidebarNav />

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Organization
            </div>
            <OrganizationSwitcher
              hidePersonal
              afterSelectOrganizationUrl="/"
              afterCreateOrganizationUrl="/"
              appearance={{
                elements: {
                  organizationSwitcherTrigger:
                    "w-full justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50",
                  organizationPreviewMainIdentifier:
                    "text-sm font-medium text-slate-900",
                  organizationPreviewSecondaryIdentifier:
                    "text-xs text-slate-500",
                },
              }}
            />
          </div>

          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            <Activity className="size-3.5" />
            Session
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-900">
                Signed in
              </div>
              <div className="text-xs text-slate-500">
                Clerk-secured tenant access
              </div>
            </div>
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "size-10 ring-1 ring-slate-200",
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="Open menu">
                  <Menu className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent
                showCloseButton={false}
                className="left-0 top-0 h-screen w-[240px] max-w-[240px] translate-x-0 translate-y-0 rounded-none border-r border-slate-200 p-0"
              >
                <DialogTitle className="sr-only">Navigation</DialogTitle>
                <SidebarRail />
              </DialogContent>
            </Dialog>
            <div>
              <div className="text-sm font-semibold text-slate-950">MemoryOS</div>
              <div className="text-xs text-slate-500">Tenant Dashboard</div>
            </div>
          </div>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "size-9 ring-1 ring-slate-200",
              },
            }}
          />
        </div>
      </div>

      <aside className="hidden h-screen w-60 shrink-0 md:sticky md:top-0 md:flex">
        <SidebarRail />
      </aside>
    </>
  );
}
