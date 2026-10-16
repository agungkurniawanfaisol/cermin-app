import Link from "next/link";
import type { ListedUser } from "@/server/actions/invites";
import { DisableUserButton } from "@/components/dashboard/disable-user-button";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  TERAPIS: "Terapis",
  ORANG_TUA: "Orang tua",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  DISABLED: "Nonaktif",
};

type Props = {
  users: ListedUser[];
  currentUserId: string;
};

export function UserList({ users, currentUserId }: Props) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] px-4 py-10 text-center">
        <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
          Tidak ada pengguna yang cocok.{" "}
          <Link
            href="/dashboard/pengguna/undang"
            className="font-medium text-[var(--cermin-accent,#3d7c6b)] underline-offset-2 hover:underline"
          >
            Buat undangan
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-3 lg:hidden" aria-label="Daftar pengguna">
        {users.map((user) => {
          const canDisable =
            user.status === "ACTIVE" && user.id !== currentUserId;
          return (
            <li key={user.id}>
              <article className="cermin-hover-card rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4 shadow-[0_1px_2px_rgba(31,41,51,0.04)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-[var(--text,#1f2933)]">
                      {user.name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-[var(--cermin-muted,#5c6b73)]">
                      {user.email}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-[var(--bg,#f7f4ef)] px-2 py-0.5 text-xs font-medium text-[var(--cermin-muted,#5c6b73)] ring-1 ring-[var(--cermin-border,#d9e2ec)]">
                    {STATUS_LABEL[user.status] ?? user.status}
                  </span>
                </div>

                <dl className="mt-3 text-sm">
                  <div>
                    <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                      Peran
                    </dt>
                    <dd className="text-[var(--text,#1f2933)]">
                      {ROLE_LABEL[user.role] ?? user.role}
                    </dd>
                  </div>
                </dl>

                {canDisable ? (
                  <div className="mt-4 border-t border-[var(--cermin-border,#d9e2ec)] pt-3">
                    <DisableUserButton userId={user.id} />
                  </div>
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] lg:block">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]">
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
                className="cermin-hover-row border-b border-[var(--cermin-border,#d9e2ec)] last:border-0"
              >
                <td className="px-4 py-3 text-[var(--text,#1f2933)]">
                  {user.name}
                </td>
                <td className="px-4 py-3 text-[var(--cermin-muted,#5c6b73)]">
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  {ROLE_LABEL[user.role] ?? user.role}
                </td>
                <td className="px-4 py-3">
                  {STATUS_LABEL[user.status] ?? user.status}
                </td>
                <td className="px-4 py-3">
                  {user.status === "ACTIVE" && user.id !== currentUserId ? (
                    <DisableUserButton userId={user.id} />
                  ) : (
                    <span className="text-[var(--cermin-muted,#5c6b73)]">
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
