"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageAudioDock, PageImage } from "@/components/belajar/page-media";

export type PreviewPageMedia = {
  id: string;
  kind: string;
  altText: string | null;
  sortOrder: number;
  studentId: string | null;
};

export type PreviewPage = {
  id: string;
  sortOrder: number;
  bodyText: string;
  media: PreviewPageMedia[];
};

export type PreviewStudentOption = {
  id: string;
  displayName: string;
};

type Props = {
  title: string;
  pages: PreviewPage[];
  students: PreviewStudentOption[];
};

function resolvePageMedia(
  media: PreviewPageMedia[],
  studentId: string | null,
) {
  const imagesAll = media
    .filter((m) => m.kind === "IMAGE")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const personalized = studentId
    ? imagesAll.filter((m) => m.studentId === studentId)
    : [];
  const shared = imagesAll.filter((m) => m.studentId == null);
  const storyAudios = media
    .filter((m) => m.kind === "AUDIO" && m.studentId == null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    portraitImage: personalized[0]
      ? { id: personalized[0].id, altText: personalized[0].altText }
      : null,
    storyImages: shared.map((m) => ({ id: m.id, altText: m.altText })),
    storyAudios: storyAudios.map((m) => ({ id: m.id, altText: m.altText })),
  };
}

export function StoryPreviewPanel({ title, pages, students }: Props) {
  const [pageIndex, setPageIndex] = useState(0);
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");

  const total = pages.length;
  const progressPct = total > 0 ? ((pageIndex + 1) / total) * 100 : 0;

  useEffect(() => {
    if (pageIndex >= total && total > 0) {
      setPageIndex(total - 1);
    }
  }, [pageIndex, total]);

  const current = useMemo(() => {
    const page = pages[pageIndex];
    if (!page) return null;
    return {
      page,
      media: resolvePageMedia(page.media, studentId || null),
    };
  }, [pages, pageIndex, studentId]);

  const goToPage = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(total - 1, index));
      setPageIndex(next);
    },
    [total],
  );

  if (total === 0) {
    return (
      <div className="rounded-xl border-2 border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-ground,#eef3f0)] px-4 py-8 sm:px-6">
        <p className="text-lg text-[#5c6b73]">
          Cerita ini belum punya halaman.
        </p>
      </div>
    );
  }

  if (!current) return null;

  const { page, media } = current;

  return (
    <div className="w-full overflow-hidden rounded-xl border-2 border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-ground,#eef3f0)]">
      <p className="border-b border-[var(--belajar-line,#c5d4cc)] px-4 py-3 text-sm text-[#5c6b73] sm:px-6">
        Pratinjau mode belajar. Tidak menyimpan sesi.
      </p>

      {/* Satu scroll di dalam panel pratinjau */}
      <div
        className="belajar-root flex w-full flex-col overflow-y-auto"
        style={{ maxHeight: "min(85dvh, 44rem)" }}
      >
        <header className="belajar-stage__header shrink-0 space-y-3 px-4 pt-4 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-wide text-[var(--belajar-accent,#3d7c6b)] uppercase">
                CERMIN
              </p>
              <h2 className="mt-0.5 truncate text-xl font-semibold sm:text-2xl">
                {title}
              </h2>
            </div>
            <p
              className="shrink-0 rounded-full bg-[var(--belajar-accent-soft,#e6f2ee)] px-3 py-1 text-sm font-semibold text-[var(--belajar-accent,#3d7c6b)]"
              aria-live="polite"
            >
              Halaman {pageIndex + 1} dari {total}
            </p>
          </div>
          <div
            className="belajar-progress-track"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={pageIndex + 1}
            aria-label={`Halaman ${pageIndex + 1} dari ${total}`}
          >
            <div
              className="belajar-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex max-w-md items-center gap-2 pb-3">
            <label
              htmlFor="preview-student"
              className="shrink-0 text-sm font-medium text-[#5c6b73]"
            >
              Murid
            </label>
            {students.length > 0 ? (
              <select
                id="preview-student"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-[var(--belajar-line,#c5d4cc)] bg-white px-2.5 text-base font-semibold text-[#1f2933]"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName}
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-xl border-2 border-dashed border-[var(--belajar-line,#c5d4cc)] bg-white px-4 py-3 text-base text-[#5c6b73]">
                Belum ada murid aktif.
              </p>
            )}
          </div>
        </header>

        <div className="belajar-book">
          <article className="belajar-book__page" aria-label="Halaman cerita">
            <div className="flex flex-col gap-4 px-4 pb-4 sm:px-6">
              <div className="grid gap-4 md:grid-cols-2 md:items-stretch md:gap-6">
                <div className="belajar-portrait p-3 sm:p-4">
                  {media.portraitImage ? (
                    <PageImage
                      key={`${media.portraitImage.id}-${studentId}`}
                      image={media.portraitImage}
                      variant="portrait"
                    />
                  ) : (
                    <p
                      className="max-w-xs text-center text-base text-[#5c6b73]"
                      role="status"
                    >
                      Belum ada foto murid untuk halaman ini.
                    </p>
                  )}
                </div>
                <div className="belajar-page-card flex min-h-0 flex-col justify-center p-4 sm:p-5 md:min-h-[min(72dvh,36rem)]">
                  <p className="whitespace-pre-wrap text-2xl leading-relaxed text-[#1f2933] sm:text-3xl">
                    {page.bodyText?.trim()
                      ? page.bodyText
                      : "Halaman ini belum ada teks."}
                  </p>
                </div>
              </div>
              {media.storyImages.length > 0 ? (
                <div className="belajar-page-card space-y-4 p-4 sm:p-5">
                  <p className="text-sm font-semibold tracking-wide text-[#5c6b73] uppercase">
                    Cerita
                  </p>
                  {media.storyImages.map((image) => (
                    <PageImage key={image.id} image={image} variant="story" />
                  ))}
                </div>
              ) : null}

              {media.storyAudios.length > 0 ? (
                <div className="flex justify-center pt-2">
                  <PageAudioDock audios={media.storyAudios} />
                </div>
              ) : null}
            </div>
          </article>
        </div>

        <nav className="belajar-nav-sticky" aria-label="Navigasi pratinjau">
          <div className="flex flex-col gap-3 px-4 sm:flex-row sm:justify-center sm:gap-4 sm:px-6">
            <button
              type="button"
              onClick={() => goToPage(pageIndex - 1)}
              disabled={pageIndex === 0}
              className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-[var(--belajar-line,#c5d4cc)] bg-white px-6 py-3 text-xl font-semibold text-[#1f2933] disabled:opacity-40 sm:w-auto sm:min-w-[10rem] sm:text-2xl"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => goToPage(pageIndex + 1)}
              disabled={pageIndex >= total - 1}
              className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-[#3d7c6b] bg-[#3d7c6b] px-6 py-3 text-xl font-semibold text-white disabled:opacity-40 sm:w-auto sm:min-w-[10rem] sm:text-2xl"
            >
              Berikutnya
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
