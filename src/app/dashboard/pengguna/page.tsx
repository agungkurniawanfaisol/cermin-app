import { redirect } from "next/navigation";
import { AuthzError, requireRole } from "@/server/policies/access";
import { listUsers } from "@/server/actions/invites";
import { InviteForm } from "./invite-form";
import { DisableUserButton } from "./disable-user-button";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  TERAPIS: "Terapis",
  ORANG_TUA: "Orang tua",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  DISABLED: "Nonaktif",
};

export default async function PenggunaPage() {
  let admin;
  try {
    admin = await requireRole("ADMIN");
  } catch (error) {
    if (error instanceof AuthzError) {
      redirect("/dashboard");
    }
    throw error;
  }

  const users = await listUsers();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <p className="text-sm font-medium tracking-wide text-[var(--accent,#3d7c6b)] uppercase">
        CERMIN
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--text,#1f2933)]">
        Pengguna
      </h1>
      <p className="mt-2 text-sm text-[var(--muted,#5c6b73)]">
        Kelola akun dan kirim undangan (tautan ditampilkan setelah dibuat).
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Undang pengguna
        </h2>
        <InviteForm />
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Daftar pengguna
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--border,#d9e2ec)] bg-white">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Peran</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--border,#d9e2ec)] last:border-0"
                >
                  <td className="px-4 py-3 text-[var(--text,#1f2933)]">
                    {user.name}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted,#5c6b73)]">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    {ROLE_LABEL[user.role] ?? user.role}
                  </td>
                  <td className="px-4 py-3">
                    {STATUS_LABEL[user.status] ?? user.status}
                  </td>
                  <td className="px-4 py-3">
                    {user.status === "ACTIVE" && user.id !== admin.id ? (
                      <DisableUserButton userId={user.id} />
                    ) : (
                      <span className="text-[var(--muted,#5c6b73)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-[var(--muted,#5c6b73)]"
                  >
                    Belum ada pengguna.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
