"use client";

import {
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "cn";
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs";
import { DashboardNav, type DashboardNavItem } from "@/components/dashboard/dashboard-nav";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { UserAccountMenu } from "@/components/dashboard/user-account-menu";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  TERAPIS: "Terapis",
  ORANG_TUA: "Ortu",
};

const STORAGE_KEY = "cermin-sidebar-collapsed";
const collapsedListeners = new Set<() => void>();

function getSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeSidebarCollapsed(onStoreChange: () => void): () => void {
  collapsedListeners.add(onStoreChange);
  return () => {
    collapsedListeners.delete(onStoreChange);
  };
}

function setSidebarCollapsed(next: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  for (const listener of collapsedListeners) listener();
}

type DashboardShellProps = {
  user: { name: string; email: string; role: string; hasImage: boolean };
  navItems: DashboardNavItem[];
  children: ReactNode;
};

export function DashboardShell({ user, navItems, children }: DashboardShellProps) {
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

  function toggleCollapsed() {
    setSidebarCollapsed(!collapsed);
  }

  return (
    <div className="min-h-full bg-[var(--bg,#f7f4ef)] lg:flex">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-[var(--cermin-border,#d9e2ec)] bg-white/95 transition-[width] duration-200 ease-out motion-reduce:transition-none lg:flex",
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
          {!collapsed ? (
            <Link
              href="/dashboard"
              className="cursor-pointer rounded px-1 text-sm font-semibold tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
            >
              CERMIN
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded text-xs font-bold tracking-wide text-[var(--cermin-accent,#3d7c6b)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
              title="CERMIN"
              aria-label="CERMIN"
            >
              C
            </Link>
          )}
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

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Shared top bar — mobile + desktop */}
        <header className="sticky top-0 z-30 border-b border-[var(--cermin-border,#d9e2ec)] bg-white/95 backdrop-blur-sm">
          <div className="flex min-h-14 w-full items-center gap-2 px-4 py-2 sm:gap-3 sm:px-5 md:px-6 lg:px-8">
            {/* Mobile menu */}
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

            {/* Expand sidebar when collapsed (desktop) */}
            {collapsed ? (
              <button
                type="button"
                onClick={toggleCollapsed}
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
                className="w-fit cursor-pointer text-xs font-semibold tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2 lg:hidden"
              >
                CERMIN
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
          {/* Soft accent line — quiet brand cue */}
          <div
            className="h-0.5 w-full bg-gradient-to-r from-[var(--cermin-accent,#3d7c6b)]/35 via-[var(--accent-soft,#e6f2ee)] to-transparent"
            aria-hidden
          />
        </header>

        {/* Mobile drawer */}
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
                <span className="text-sm font-semibold tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
                  Menu
                </span>
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

        {children}
      </div>
    </div>
  );
}
