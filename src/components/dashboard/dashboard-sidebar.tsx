"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "cn";
import {
  DashboardNav,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-nav";
import { LogoutButton } from "@/components/dashboard/logout-button";
import {
  getSidebarCollapsed,
  setSidebarCollapsed,
  subscribeSidebarCollapsed,
} from "@/components/dashboard/sidebar-collapsed";
import { BrandMark } from "@/components/brand/brand-mark";
import type { BrandingPublic } from "@/lib/branding-public";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  TERAPIS: "Terapis",
  ORANG_TUA: "Ortu",
};

type Props = {
  navItems: DashboardNavItem[];
  role: string;
  branding: BrandingPublic;
};

export function DashboardSidebar({ navItems, role, branding }: Props) {
  const collapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    getSidebarCollapsed,
    () => false,
  );
  const roleLabel = ROLE_LABEL[role] ?? role;

  function toggleCollapsed() {
    setSidebarCollapsed(!collapsed);
  }

  return (
    <aside
      className={cn(
        "dashboard-chrome-sidebar sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-[var(--cermin-border,#d9e2ec)] bg-white/95 transition-[width] duration-200 ease-out motion-reduce:transition-none lg:flex",
        collapsed ? "w-[4.5rem]" : "w-60",
      )}
      aria-label="Menu utama"
      data-collapsed={collapsed ? "true" : "false"}
    >
      <div
        className={cn(
          "flex h-14 items-center gap-1",
          collapsed ? "justify-center px-1" : "justify-between px-3",
        )}
      >
        <Link
          href="/dashboard"
          className="min-w-0 cursor-pointer rounded-lg px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
          title="CERMIN"
          aria-label="CERMIN"
        >
          <BrandMark
            hasLogo={branding.hasLogo}
            logoVersion={branding.logoVersion}
            compact={collapsed}
            showWordmark={!collapsed}
            className={collapsed ? "min-h-9" : "min-h-11 text-sm"}
          />
        </Link>
        {!collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-[var(--cermin-muted,#5c6b73)] transition-colors duration-200 hover:bg-[var(--accent-soft,#e6f2ee)] hover:text-[var(--cermin-accent,#3d7c6b)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
            aria-label="Ciutkan sidebar"
            title="Ciutkan sidebar"
          >
            <PanelLeftClose className="size-5" aria-hidden />
          </button>
        ) : null}
      </div>

      <div
        className={cn(
          "flex-1 overflow-y-auto py-2",
          collapsed ? "px-1.5" : "px-3",
        )}
      >
        <DashboardNav
          items={navItems}
          orientation="vertical"
          collapsed={collapsed}
        />
      </div>

      <div
        className={cn(
          "space-y-2 border-t border-[var(--cermin-border,#d9e2ec)]",
          collapsed ? "flex flex-col items-center gap-1 p-2" : "p-3",
        )}
      >
        {!collapsed ? (
          <p className="truncate px-1 text-xs text-[var(--cermin-muted,#5c6b73)]">
            {roleLabel}
          </p>
        ) : null}
        <LogoutButton fullWidth={!collapsed} iconOnly={collapsed} />
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-[var(--cermin-muted,#5c6b73)] transition-colors duration-200 hover:bg-[var(--accent-soft,#e6f2ee)] hover:text-[var(--cermin-accent,#3d7c6b)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
            aria-label="Bentangkan sidebar"
            title="Bentangkan sidebar"
          >
            <PanelLeftOpen className="size-5" aria-hidden />
          </button>
        ) : null}
      </div>
    </aside>
  );
}

export function DashboardSidebarFallback() {
  return (
    <aside
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-[var(--cermin-border,#d9e2ec)] bg-white/95 lg:flex"
      aria-hidden
    >
      <div className="flex h-14 items-center px-3">
        <span className="text-sm font-semibold tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
          CERMIN
        </span>
      </div>
      <div className="flex-1 space-y-2 px-3 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-11 animate-pulse rounded-lg bg-[var(--bg,#f7f4ef)] motion-reduce:animate-none"
          />
        ))}
      </div>
    </aside>
  );
}
