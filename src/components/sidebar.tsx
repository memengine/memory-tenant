"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  Activity,
  BookOpen,
  Brain,
  Code2,
  ExternalLink,
  Fingerprint,
  GitMerge,
  GraduationCap,
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
import { useConflictStats } from "@/hooks/useConflictStats";
import { useDomainSchema } from "@/hooks/useDomainSchema";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/memories", label: "Memories", icon: Brain },
  { href: "/playground", label: "Playground", icon: Sparkles },
  { href: "/sdk", label: "SDK", icon: Code2 },
  { href: "/memory-passport", label: "Memory Passport", icon: Fingerprint },
  { href: "/users", label: "Users", icon: Users },
  { href: "/quality-log", label: "Quality Log", icon: ShieldAlert },
  { href: "/conflicts", label: "Conflicts", icon: GitMerge },
  { href: "/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const docsHref = "https://memoryengine.mintlify.app";

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav() {
  const pathname = usePathname();
  const conflictStats = useConflictStats();
  const domain = useDomainSchema();
  const requiresAttention = conflictStats.data?.requires_attention ?? 0;
  const items =
    domain.domainSchema === "edtech"
      ? [
          ...navItems.slice(0, 4),
          { href: "/students", label: "Students", icon: GraduationCap },
          ...navItems.slice(4),
        ]
      : navItems;

  return (
    <nav className="flex flex-col gap-1.5">
      {items.map((item) => {
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
            {item.href === "/conflicts" && requiresAttention > 0 ? (
              <span
                aria-label={`${requiresAttention} conflicts need attention`}
                className="ml-auto min-w-5 rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-amber-800"
              >
                {requiresAttention > 9 ? "9+" : requiresAttention}
              </span>
            ) : null}
          </Link>
        );
      })}
      <a
        href={docsHref}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
      >
        <BookOpen className="size-4" />
        <span>Docs</span>
        <ExternalLink className="ml-auto size-3.5 text-slate-400" />
      </a>
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
              Workspace
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
                Tenant access active
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
