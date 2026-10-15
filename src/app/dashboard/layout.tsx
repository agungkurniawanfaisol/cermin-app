import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { DashboardNavItem } from "@/components/dashboard/dashboard-nav";
import { prisma } from "@/lib/db";
import { AuthzError, requireSession } from "@/server/policies/access";

/** Auth layout reads cookies/headers — allow blocking / stream behind Suspense. */
export const instant = false;

function DashboardShellFallback() {
  return (
    <div className="min-h-full flex flex-col bg-[var(--bg,#f7f4ef)]">
      <header className="border-b border-[var(--cermin-border,#d9e2ec)] bg-white/95">
        <div className="flex min-h-14 w-full items-center gap-3 px-4 py-2 sm:px-5 md:px-6 lg:px-8">
          <span className="text-xs font-semibold tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
            CERMIN
          </span>
          <span className="text-sm text-[var(--cermin-muted,#5c6b73)]">
            Memuat jejak halaman…
          </span>
        </div>
        <div
          className="h-0.5 w-full bg-gradient-to-r from-[var(--cermin-accent,#3d7c6b)]/35 via-[var(--accent-soft,#e6f2ee)] to-transparent"
          aria-hidden
        />
      </header>
      <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10">
        <p className="text-[var(--cermin-muted,#5c6b73)]">Memuat dasbor…</p>
      </main>
    </div>
  );
}

async function DashboardAuthLayout({ children }: { children: ReactNode }) {
  let user;
  try {
    user = await requireSession();
  } catch (error) {
    if (error instanceof AuthzError && (error.status === 401 || error.status === 403)) {
      redirect("/login");
    }
    throw error;
  }

  const navItems: DashboardNavItem[] = [
    { href: "/dashboard", label: "Dasbor", exact: true },
    { href: "/dashboard/murid", label: "Murid" },
    { href: "/dashboard/cerita", label: "Cerita" },
    { href: "/dashboard/sesi", label: "Sesi" },
    ...(user.role === "ADMIN"
      ? [{ href: "/dashboard/pengguna", label: "Pengguna" }]
      : []),
    { href: "/dashboard/pengaturan", label: "Pengaturan" },
  ];

  let hasImage = false;
  try {
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { image: true },
    });
    hasImage = Boolean(
      profile?.image && !profile.image.startsWith("http"),
    );
  } catch {
    // Stale Prisma client / transient DB — shell still renders without avatar.
    hasImage = false;
  }

  return (
    <DashboardShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        hasImage,
      }}
      navItems={navItems}
    >
      {children}
    </DashboardShell>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<DashboardShellFallback />}>
      <DashboardAuthLayout>{children}</DashboardAuthLayout>
    </Suspense>
  );
}
