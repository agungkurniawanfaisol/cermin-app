import Link from "next/link";
import { requireSession } from "@/server/policies/access";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  TERAPIS: "Terapis",
  ORANG_TUA: "Orang tua",
};

export default async function DashboardPage() {
  const user = await requireSession();
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <p className="text-sm font-medium tracking-wide text-[var(--accent,#3d7c6b)] uppercase">
        CERMIN
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--text,#1f2933)]">
        Dasbor CERMIN
      </h1>
      <p className="mt-4 text-[var(--muted,#5c6b73)]">
        Selamat datang, <span className="font-medium text-[var(--text,#1f2933)]">{user.name}</span>
        {" · "}
        peran: <span className="font-medium text-[var(--text,#1f2933)]">{roleLabel}</span>
      </p>

      <nav
        className="mt-10 grid gap-3 sm:grid-cols-3"
        aria-label="Pintasan dasbor"
      >
        <Link
          href="/dashboard/murid"
          className="rounded-xl border border-[var(--border,#d9e2ec)] bg-white px-4 py-5 text-[var(--text,#1f2933)] shadow-sm hover:border-[var(--accent,#3d7c6b)] hover:text-[var(--accent,#3d7c6b)]"
        >
          <span className="block text-lg font-semibold">Murid</span>
          <span className="mt-1 block text-sm text-[var(--muted,#5c6b73)]">
            Profil dan penugasan
          </span>
        </Link>
        <Link
          href="/dashboard/cerita"
          className="rounded-xl border border-[var(--border,#d9e2ec)] bg-white px-4 py-5 text-[var(--text,#1f2933)] shadow-sm hover:border-[var(--accent,#3d7c6b)] hover:text-[var(--accent,#3d7c6b)]"
        >
          <span className="block text-lg font-semibold">Cerita</span>
          <span className="mt-1 block text-sm text-[var(--muted,#5c6b73)]">
            Editor cerita sosial
          </span>
        </Link>
        <Link
          href="/dashboard/sesi"
          className="rounded-xl border border-[var(--border,#d9e2ec)] bg-white px-4 py-5 text-[var(--text,#1f2933)] shadow-sm hover:border-[var(--accent,#3d7c6b)] hover:text-[var(--accent,#3d7c6b)]"
        >
          <span className="block text-lg font-semibold">Sesi</span>
          <span className="mt-1 block text-sm text-[var(--muted,#5c6b73)]">
            Mulai mode anak
          </span>
        </Link>
      </nav>
    </main>
  );
}
