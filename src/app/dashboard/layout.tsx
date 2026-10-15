import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthzError, requireSession } from "@/server/policies/access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await requireSession();
  } catch (error) {
    if (error instanceof AuthzError && error.status === 401) {
      redirect("/login");
    }
    if (error instanceof AuthzError && error.status === 403) {
      redirect("/login");
    }
    throw error;
  }

  return (
    <div className="min-h-full flex flex-col bg-[var(--bg,#f7f4ef)]">
      <header className="border-b border-[var(--border,#d9e2ec)] bg-white/80">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-6 px-4 py-3">
          <Link
            href="/dashboard"
            className="text-sm font-semibold tracking-wide text-[var(--accent,#3d7c6b)] uppercase"
          >
            CERMIN
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="text-[var(--text,#1f2933)] hover:text-[var(--accent,#3d7c6b)]"
            >
              Dasbor
            </Link>
            <Link
              href="/dashboard/murid"
              className="text-[var(--text,#1f2933)] hover:text-[var(--accent,#3d7c6b)]"
            >
              Murid
            </Link>
            <Link
              href="/dashboard/cerita"
              className="text-[var(--text,#1f2933)] hover:text-[var(--accent,#3d7c6b)]"
            >
              Cerita
            </Link>
            <Link
              href="/dashboard/sesi"
              className="text-[var(--text,#1f2933)] hover:text-[var(--accent,#3d7c6b)]"
            >
              Sesi
            </Link>
            {user.role === "ADMIN" ? (
              <Link
                href="/dashboard/pengguna"
                className="text-[var(--text,#1f2933)] hover:text-[var(--accent,#3d7c6b)]"
              >
                Pengguna
              </Link>
            ) : null}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
