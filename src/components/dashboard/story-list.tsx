import Link from "next/link";
import type { ListedStory } from "@/server/actions/stories";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draf",
  REVIEW: "Review",
  APPROVED: "Disetujui",
  PUBLISHED: "Terbit",
  ARCHIVED: "Arsip",
};

type Props = {
  stories: ListedStory[];
  canManage: boolean;
};

export function StoryList({ stories, canManage }: Props) {
  if (stories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] px-4 py-10 text-center">
        <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
          Tidak ada cerita yang cocok dengan filter.
          {canManage ? (
            <>
              {" "}
              <Link
                href="/dashboard/cerita/baru"
                className="font-medium text-[var(--cermin-accent,#3d7c6b)] underline-offset-2 hover:underline"
              >
                Buat cerita
              </Link>
            </>
          ) : null}
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-3 lg:hidden" aria-label="Daftar cerita">
        {stories.map((story) => (
          <li key={story.id}>
            <article className="rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4 shadow-[0_1px_2px_rgba(31,41,51,0.04)]">
              <Link
                href={`/dashboard/cerita/${story.id}`}
                className="block truncate text-base font-semibold text-[var(--cermin-accent,#3d7c6b)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
              >
                {story.title}
              </Link>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                    Kategori
                  </dt>
                  <dd className="text-[var(--text,#1f2933)]">
                    {story.category.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                    Status
                  </dt>
                  <dd className="text-[var(--text,#1f2933)]">
                    {STATUS_LABEL[story.status] ?? story.status}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                    Pembuat
                  </dt>
                  <dd className="truncate text-[var(--text,#1f2933)]">
                    {story.createdBy.name}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 border-t border-[var(--cermin-border,#d9e2ec)] pt-3">
                <Link
                  href={`/dashboard/cerita/${story.id}`}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] px-3 text-sm font-medium text-[var(--text,#1f2933)] transition-colors hover:bg-[var(--accent-soft,#e6f2ee)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
                >
                  Lihat cerita
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] lg:block">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]">
            <tr>
              <th className="px-4 py-3 font-medium">Judul</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Pembuat</th>
            </tr>
          </thead>
          <tbody>
            {stories.map((story) => (
              <tr
                key={story.id}
                className="border-b border-[var(--cermin-border,#d9e2ec)] last:border-0"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/cerita/${story.id}`}
                    className="font-medium text-[var(--cermin-accent,#3d7c6b)] hover:underline"
                  >
                    {story.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--cermin-muted,#5c6b73)]">
                  {story.category.name}
                </td>
                <td className="px-4 py-3">
                  {STATUS_LABEL[story.status] ?? story.status}
                </td>
                <td className="px-4 py-3 text-[var(--cermin-muted,#5c6b73)]">
                  {story.createdBy.name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
