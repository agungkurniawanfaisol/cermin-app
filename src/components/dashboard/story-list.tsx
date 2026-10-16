"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, PencilLine, BookOpen } from "lucide-react";
import type { ListedStory } from "@/server/actions/stories";
import { StoryDetailSheet } from "@/components/dashboard/story-detail-sheet";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draf",
  REVIEW: "Review",
  APPROVED: "Disetujui",
  PUBLISHED: "Terbit",
  ARCHIVED: "Arsip",
};

export type StoryListItem = ListedStory & {
  continueLabel: string;
  continuePrimary: boolean;
};

type Props = {
  stories: StoryListItem[];
  canManage: boolean;
};

function descriptionSnippet(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "Belum ada deskripsi.";
  if (t.length <= 110) return t;
  return `${t.slice(0, 109)}…`;
}

function ContinueIcon({ primary }: { primary: boolean }) {
  return primary ? (
    <PencilLine className="size-5" aria-hidden />
  ) : (
    <BookOpen className="size-5" aria-hidden />
  );
}

const iconBtnBase =
  "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2";

const iconBtnOutline = `${iconBtnBase} border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] text-[var(--text,#1f2933)] hover:bg-[var(--accent-soft,#e6f2ee)]`;

const iconBtnPrimary = `${iconBtnBase} bg-[var(--cermin-accent,#3d7c6b)] text-white hover:bg-[var(--focus,#0b6e4f)]`;

const iconBtnSecondary = `${iconBtnBase} border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] text-[var(--text,#1f2933)] hover:bg-[var(--accent-soft,#e6f2ee)]`;

export function StoryList({ stories, canManage }: Props) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailStory = stories.find((s) => s.id === detailId) ?? null;

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
        {stories.map((story) => {
          const href = `/dashboard/cerita/${story.id}`;
          return (
            <li key={story.id}>
              <article className="cermin-hover-card rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4 shadow-[0_1px_2px_rgba(31,41,51,0.04)]">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setDetailId(story.id)}
                    className="min-w-0 flex-1 cursor-pointer truncate text-left text-base font-semibold text-[var(--cermin-accent,#3d7c6b)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
                  >
                    {story.title}
                  </button>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailId(story.id)}
                      className={iconBtnOutline}
                      aria-label={`Detail dan pratinjau: ${story.title}`}
                      title="Detail & pratinjau"
                    >
                      <Eye className="size-5" aria-hidden />
                    </button>
                    <Link
                      href={href}
                      prefetch
                      className={
                        story.continuePrimary
                          ? iconBtnPrimary
                          : iconBtnSecondary
                      }
                      aria-label={`${story.continueLabel}: ${story.title}`}
                      title={story.continueLabel}
                    >
                      <ContinueIcon primary={story.continuePrimary} />
                    </Link>
                  </div>
                </div>
                <p className="mt-2 text-sm text-[var(--cermin-muted,#5c6b73)]">
                  {descriptionSnippet(story.description)}
                </p>
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
                  <div>
                    <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                      Halaman
                    </dt>
                    <dd className="text-[var(--text,#1f2933)]">
                      {story.pageCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--cermin-muted,#5c6b73)]">
                      Pembuat
                    </dt>
                    <dd className="truncate text-[var(--text,#1f2933)]">
                      {story.createdBy.name}
                    </dd>
                  </div>
                </dl>
              </article>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] lg:block">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]">
            <tr>
              <th className="px-4 py-3 font-medium">Judul</th>
              <th className="px-4 py-3 font-medium">Ringkasan</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Halaman</th>
              <th className="w-[7.5rem] px-4 py-3 text-right font-medium">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {stories.map((story) => {
              const href = `/dashboard/cerita/${story.id}`;
              return (
                <tr
                  key={story.id}
                  className="cermin-hover-row border-b border-[var(--cermin-border,#d9e2ec)] last:border-0"
                >
                  <td className="px-4 py-3 align-middle">
                    <button
                      type="button"
                      onClick={() => setDetailId(story.id)}
                      className="cursor-pointer text-left font-medium text-[var(--cermin-accent,#3d7c6b)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)]"
                    >
                      {story.title}
                    </button>
                    <p className="mt-1 text-xs text-[var(--cermin-muted,#5c6b73)]">
                      {story.createdBy.name}
                    </p>
                  </td>
                  <td className="max-w-[14rem] px-4 py-3 align-middle text-[var(--cermin-muted,#5c6b73)]">
                    {descriptionSnippet(story.description)}
                  </td>
                  <td className="px-4 py-3 align-middle text-[var(--cermin-muted,#5c6b73)]">
                    {story.category.name}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {STATUS_LABEL[story.status] ?? story.status}
                  </td>
                  <td className="px-4 py-3 align-middle tabular-nums">
                    {story.pageCount}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDetailId(story.id)}
                        className={iconBtnOutline}
                        aria-label={`Detail dan pratinjau: ${story.title}`}
                        title="Detail & pratinjau"
                      >
                        <Eye className="size-5" aria-hidden />
                      </button>
                      <Link
                        href={href}
                        prefetch
                        className={
                          story.continuePrimary
                            ? iconBtnPrimary
                            : iconBtnSecondary
                        }
                        aria-label={`${story.continueLabel}: ${story.title}`}
                        title={story.continueLabel}
                      >
                        <ContinueIcon primary={story.continuePrimary} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <StoryDetailSheet
        storyId={detailId}
        seed={
          detailStory
            ? {
                id: detailStory.id,
                title: detailStory.title,
                description: detailStory.description,
                status: detailStory.status,
                pageCount: detailStory.pageCount,
                category: detailStory.category,
                createdBy: detailStory.createdBy,
              }
            : null
        }
        open={detailId != null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        continueHref={
          detailStory ? `/dashboard/cerita/${detailStory.id}` : null
        }
        continueLabel={detailStory?.continueLabel ?? "Buka cerita"}
      />
    </>
  );
}
