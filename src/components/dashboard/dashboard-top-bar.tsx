"use client";

import {
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { Menu, PanelLeftOpen, X } from "lucide-react";
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs";
import {
  DashboardNav,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-nav";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { UserAccountMenu } from "@/components/dashboard/user-account-menu";
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
  user: { name: string; email: string; role: string; hasImage: boolean };
  navItems: DashboardNavItem[];
  branding: BrandingPublic;
};

export function DashboardTopBar({ user, navItems, branding }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const collapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    getSidebarCollapsed,
    () => false,
  );
  const panelId = useId();
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <header className="dashboard-chrome-topbar sticky top-0 z-30 border-b border-[var(--cermin-border,#d9e2ec)] bg-white/95 backdrop-blur-sm">
        <div className="flex min-h-14 w-full items-center gap-2 px-4 py-2 sm:gap-3 sm:px-5 md:px-6 lg:px-8">
          <button
            type="button"
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--text,#1f2933)] transition-colors duration-200 hover:bg-[var(--accent-soft,#e6f2ee)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls={panelId}
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Menu className="size-5" aria-hidden />
            )}
          </button>

          {collapsed ? (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="hidden size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--cermin-muted,#5c6b73)] transition-colors duration-200 hover:bg-[var(--accent-soft,#e6f2ee)] hover:text-[var(--cermin-accent,#3d7c6b)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2 lg:inline-flex"
              aria-label="Bentangkan sidebar"
              title="Bentangkan sidebar"
            >
              <PanelLeftOpen className="size-5" aria-hidden />
            </button>
          ) : null}

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Link
              href="/dashboard"
              className="w-fit cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2 lg:hidden"
              aria-label="CERMIN"
            >
              <BrandMark
                hasLogo={branding.hasLogo}
                logoVersion={branding.logoVersion}
                showWordmark
                className="min-h-9 text-xs"
              />
            </Link>
            <DashboardBreadcrumbs className="min-w-0" />
          </div>

          <div className="ml-auto shrink-0">
            <UserAccountMenu
              name={user.name}
              email={user.email}
              roleLabel={roleLabel}
              hasImage={user.hasImage}
            />
          </div>
        </div>
        <div
          className="h-0.5 w-full bg-gradient-to-r from-[var(--cermin-accent,#3d7c6b)]/35 via-[var(--accent-soft,#e6f2ee)] to-transparent"
          aria-hidden
        />
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-[var(--text,#1f2933)]/30"
            aria-label="Tutup menu"
            onClick={closeMenu}
          />
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
            className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col bg-white shadow-lg"
          >
            <div className="flex h-14 items-center justify-between border-b border-[var(--cermin-border,#d9e2ec)] px-4">
              <BrandMark
                hasLogo={branding.hasLogo}
                logoVersion={branding.logoVersion}
                showWordmark
                className="min-h-9 text-sm"
              />
              <button
                type="button"
                className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg hover:bg-[var(--accent-soft,#e6f2ee)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)]"
                aria-label="Tutup menu"
                onClick={closeMenu}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <DashboardNav
                items={navItems}
                orientation="vertical"
                onNavigate={closeMenu}
              />
            </div>
            <div className="space-y-2 border-t border-[var(--cermin-border,#d9e2ec)] p-3">
              <p className="truncate px-1 text-xs text-[var(--cermin-muted,#5c6b73)]">
                {user.email}
              </p>
              <LogoutButton fullWidth />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function DashboardTopBarFallback() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--cermin-border,#d9e2ec)] bg-white/95">
      <div className="flex min-h-14 w-full items-center gap-3 px-4 py-2 sm:px-5 md:px-6 lg:px-8">
        <span className="text-xs font-semibold tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
          CERMIN
        </span>
        <span className="h-4 w-32 animate-pulse rounded bg-[var(--bg,#f7f4ef)] motion-reduce:animate-none" />
        <span className="ml-auto size-9 animate-pulse rounded-full bg-[var(--bg,#f7f4ef)] motion-reduce:animate-none" />
      </div>
      <div
        className="h-0.5 w-full bg-gradient-to-r from-[var(--cermin-accent,#3d7c6b)]/35 via-[var(--accent-soft,#e6f2ee)] to-transparent"
        aria-hidden
      />
    </header>
  );
}
