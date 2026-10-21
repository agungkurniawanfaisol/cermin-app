"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  ScrollText,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import { cn } from "cn";

export type DashboardNavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

const ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/murid": Users,
  "/dashboard/cerita": BookOpen,
  "/dashboard/sesi": ClipboardList,
  "/dashboard/pengguna": UserCog,
  "/dashboard/audit": ScrollText,
  "/dashboard/bantuan": CircleHelp,
  "/dashboard/pengaturan": Settings,
};

type DashboardNavProps = {
  items: DashboardNavItem[];
  orientation?: "horizontal" | "vertical";
  /** Icon-only rail (desktop sidebar collapsed) */
  collapsed?: boolean;
  onNavigate?: () => void;
};

function NavPendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "ml-auto size-1.5 shrink-0 rounded-full bg-[var(--cermin-accent,#3d7c6b)] transition-opacity duration-150",
        pending ? "opacity-100" : "opacity-0",
      )}
    />
  );
}

export function DashboardNav({
  items,
  orientation = "vertical",
  collapsed = false,
  onNavigate,
}: DashboardNavProps) {
  const pathname = usePathname();
  const vertical = orientation === "vertical";
  const iconOnly = vertical && collapsed;

  return (
    <nav
      className={cn(
        vertical
          ? "flex flex-col gap-1"
          : "flex flex-nowrap items-center gap-0.5 sm:gap-1",
      )}
      aria-label="Navigasi dasbor"
    >
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = ICONS[item.href];

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={onNavigate}
            title={iconOnly ? item.label : undefined}
            className={cn(
              "relative inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg text-sm font-medium transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2",
              vertical ? "w-full px-3 py-2" : "shrink-0 px-2.5 py-2 sm:px-3",
              iconOnly && "justify-center px-0",
              active
                ? "bg-[var(--accent-soft,#e6f2ee)] text-[var(--cermin-accent,#3d7c6b)]"
                : "text-[var(--text,#1f2933)] hover:bg-[var(--accent-soft,#e6f2ee)]/70 hover:text-[var(--cermin-accent,#3d7c6b)]",
            )}
            aria-current={active ? "page" : undefined}
            aria-label={iconOnly ? item.label : undefined}
          >
            {vertical && Icon ? (
              <Icon className="size-4 shrink-0" aria-hidden />
            ) : null}
            {iconOnly ? (
              <span className="sr-only">{item.label}</span>
            ) : (
              item.label
            )}
            {vertical && !iconOnly ? <NavPendingHint /> : null}
            {!vertical ? (
              <span
                className={cn(
                  "absolute inset-x-2.5 -bottom-0.5 h-0.5 rounded-full bg-[var(--cermin-accent,#3d7c6b)] transition-opacity duration-200 sm:inset-x-3",
                  active ? "opacity-100" : "opacity-0",
                )}
                aria-hidden
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
