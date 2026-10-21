import type { ListedAuditLog } from "@/server/actions/audit";
import { formatDateTimeId } from "@/lib/format-date";

type Props = {
  items: ListedAuditLog[];
};

function formatMetadata(meta: Record<string, unknown> | null): string {
  if (!meta || Object.keys(meta).length === 0) return "—";
  try {
    const raw = JSON.stringify(meta);
    return raw.length > 120 ? `${raw.slice(0, 117)}…` : raw;
  } catch {
    return "—";
  }
}

export function AuditLogList({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] px-4 py-10 text-center">
        <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
          Belum ada catatan audit untuk filter ini.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-3 lg:hidden" aria-label="Log audit">
        {items.map((row) => (
          <li key={row.id}>
            <article className="rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4 shadow-[0_1px_2px_rgba(31,41,51,0.04)]">
              <p className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                {formatDateTimeId(row.createdAt)}
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-[var(--text,#1f2933)]">
                {row.action}
              </p>
              <dl className="mt-3 grid gap-2 text-sm">
                <div>
                  <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                    Aktor
                  </dt>
                  <dd className="text-[var(--text,#1f2933)]">
                    {row.actor
                      ? `${row.actor.name} (${row.actor.email})`
                      : "Sistem"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                    Entitas
                  </dt>
                  <dd className="break-all text-[var(--text,#1f2933)]">
                    {row.entityType}
                    {row.entityId ? ` · ${row.entityId}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                    Metadata
                  </dt>
                  <dd className="break-all font-mono text-xs text-[var(--cermin-muted,#5c6b73)]">
                    {formatMetadata(row.metadata)}
                  </dd>
                </div>
              </dl>
            </article>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] lg:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] text-xs font-medium text-[var(--cermin-muted,#5c6b73)]">
            <tr>
              <th className="px-4 py-3 font-medium">Waktu</th>
              <th className="px-4 py-3 font-medium">Aktor</th>
              <th className="px-4 py-3 font-medium">Aksi</th>
              <th className="px-4 py-3 font-medium">Entitas</th>
              <th className="px-4 py-3 font-medium">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--cermin-border,#d9e2ec)] last:border-b-0"
              >
                <td className="whitespace-nowrap px-4 py-3 text-[var(--text,#1f2933)]">
                  {formatDateTimeId(row.createdAt)}
                </td>
                <td className="max-w-[12rem] truncate px-4 py-3 text-[var(--text,#1f2933)]">
                  {row.actor ? row.actor.name : "Sistem"}
                  {row.actor ? (
                    <span className="mt-0.5 block truncate text-xs text-[var(--cermin-muted,#5c6b73)]">
                      {row.actor.email}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-medium text-[var(--text,#1f2933)]">
                  {row.action}
                </td>
                <td className="max-w-[14rem] px-4 py-3 text-[var(--text,#1f2933)]">
                  <span className="block">{row.entityType}</span>
                  {row.entityId ? (
                    <span className="mt-0.5 block truncate font-mono text-xs text-[var(--cermin-muted,#5c6b73)]">
                      {row.entityId}
                    </span>
                  ) : null}
                </td>
                <td className="max-w-[16rem] px-4 py-3 font-mono text-xs text-[var(--cermin-muted,#5c6b73)]">
                  <span className="line-clamp-2 break-all">
                    {formatMetadata(row.metadata)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
