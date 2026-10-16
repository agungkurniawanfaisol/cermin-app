"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { buildDashboardBreadcrumbs } from "@/lib/dashboard-breadcrumbs";

type DashboardBreadcrumbsProps = {
  className?: string;
};

export function DashboardBreadcrumbs({ className }: DashboardBreadcrumbsProps) {
  const pathname = usePathname() ?? "/dashboard";
  const crumbs = buildDashboardBreadcrumbs(pathname);

  return (
    <nav
      aria-label="Jejak halaman"
      className={className}
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex min-w-0 items-center gap-1">
            {index > 0 ? (
              <ChevronRight
                className="size-3.5 shrink-0 text-[var(--cermin-border,#d9e2ec)]"
                aria-hidden
              />
            ) : null}
            {crumb.current ? (
              <span
                aria-current="page"
                className="truncate font-medium text-[var(--text,#1f2933)]"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="truncate rounded text-[var(--cermin-muted,#5c6b73)] transition-colors hover:text-[var(--cermin-accent,#3d7c6b)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
