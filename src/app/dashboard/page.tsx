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
    </main>
  );
}
