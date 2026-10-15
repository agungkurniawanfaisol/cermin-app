import Link from "next/link";
import type { ListedSession } from "@/server/actions/sessions";
import { formatDateTimeId } from "@/lib/format-date";

type Props = {
  sessions: ListedSession[];
};

export function SessionList({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] px-4 py-10 text-center">
        <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
          Belum ada riwayat sesi untuk filter ini.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-3 lg:hidden" aria-label="Riwayat sesi">
        {sessions.map((session) => (
          <li key={session.id}>
            <article className="rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4 shadow-[0_1px_2px_rgba(31,41,51,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/dashboard/murid/${session.student.id}`}
                    className="block truncate text-base font-semibold text-[var(--cermin-accent,#3d7c6b)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
                  >
                    {session.student.displayName}
                  </Link>
                  <p className="mt-0.5 truncate text-sm text-[var(--text,#1f2933)]">
                    {session.story.title}
                  </p>
                </div>
                {session.endedAt ? (
                  <span className="shrink-0 rounded-md bg-[var(--bg,#f7f4ef)] px-2 py-0.5 text-xs font-medium text-[var(--cermin-muted,#5c6b73)] ring-1 ring-[var(--cermin-border,#d9e2ec)]">
                    Selesai
                  </span>
                ) : (
                  <span className="shrink-0 rounded-md bg-[var(--accent-soft,#e6f2ee)] px-2 py-0.5 text-xs font-medium text-[var(--focus,#0b6e4f)] ring-1 ring-[var(--cermin-accent,#3d7c6b)]/20">
                    Berjalan
                  </span>
                )}
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                    Mulai
                  </dt>
                  <dd className="text-[var(--text,#1f2933)]">
                    {formatDateTimeId(session.startedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                    Pemandu
                  </dt>
                  <dd className="truncate text-[var(--text,#1f2933)]">
                    {session.ledBy.name}
                  </dd>
                </div>
              </dl>

              {!session.endedAt ? (
                <div className="mt-4 border-t border-[var(--cermin-border,#d9e2ec)] pt-3">
                  <Link
                    href={`/belajar/${session.id}`}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--cermin-accent,#3d7c6b)] px-3 text-sm font-medium text-white transition-colors hover:bg-[var(--focus,#0b6e4f)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
                  >
                    Lanjutkan
                  </Link>
                </div>
              ) : null}
            </article>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] lg:block">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]">
            <tr>
              <th className="px-4 py-3 font-medium">Mulai</th>
              <th className="px-4 py-3 font-medium">Murid</th>
              <th className="px-4 py-3 font-medium">Cerita</th>
              <th className="px-4 py-3 font-medium">Pemandu</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr
                key={session.id}
                className="border-b border-[var(--cermin-border,#d9e2ec)] last:border-0"
              >
                <td className="px-4 py-3 text-[var(--cermin-muted,#5c6b73)]">
                  {formatDateTimeId(session.startedAt)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/murid/${session.student.id}`}
                    className="font-medium text-[var(--cermin-accent,#3d7c6b)] hover:underline"
                  >
                    {session.student.displayName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--text,#1f2933)]">
                  {session.story.title}
                </td>
                <td className="px-4 py-3 text-[var(--cermin-muted,#5c6b73)]">
                  {session.ledBy.name}
                </td>
                <td className="px-4 py-3">
                  {session.endedAt ? (
                    <span className="text-[var(--cermin-muted,#5c6b73)]">
                      Selesai
                    </span>
                  ) : (
                    <Link
                      href={`/belajar/${session.id}`}
                      className="font-medium text-[var(--cermin-accent,#3d7c6b)] hover:underline"
                    >
                      Lanjutkan
                    </Link>
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
