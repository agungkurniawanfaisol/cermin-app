"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageAudioButton, PageImage } from "@/components/belajar/page-media";

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

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function StoryPreviewPanel({ title, pages, students }: Props) {
  const bookRef = useRef<HTMLDivElement>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");

  const total = pages.length;
  const progressPct = total > 0 ? ((pageIndex + 1) / total) * 100 : 0;

  const resolvedPages = useMemo(
    () =>
      pages.map((p) => ({
        page: p,
        media: resolvePageMedia(p.media, studentId || null),
      })),
    [pages, studentId],
  );

  const scrollToPage = useCallback(
    (index: number) => {
      const el = bookRef.current;
      if (!el) return;
      const next = Math.max(0, Math.min(total - 1, index));
      const behavior = prefersReducedMotion() ? "auto" : "smooth";
      el.scrollTo({ left: el.clientWidth * next, behavior });
      setPageIndex(next);
    },
    [total],
  );

  useEffect(() => {
    const el = bookRef.current;
    if (!el || total === 0) return;
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const book = bookRef.current;
        if (!book) {
          ticking = false;
          return;
        }
        const width = book.clientWidth || 1;
        const i = Math.round(book.scrollLeft / width);
        setPageIndex(Math.max(0, Math.min(total - 1, i)));
        ticking = false;
      });
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [total]);

  if (total === 0) {
    return (
      <div className="rounded-xl border-2 border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-ground,#eef3f0)] px-4 py-8 sm:px-6">
        <p className="text-lg text-[#5c6b73]">
          Cerita ini belum punya halaman.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border-2 border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-ground,#eef3f0)]">
      <p className="border-b border-[var(--belajar-line,#c5d4cc)] px-4 py-3 text-sm text-[#5c6b73] sm:px-6">
        Pratinjau mode belajar — geser seperti buku. Tidak menyimpan sesi.
      </p>

      <div
        className="belajar-root flex w-full flex-col"
        style={{ height: "min(85dvh, 44rem)" }}
      >
        <header className="shrink-0 space-y-3 px-4 pt-4 sm:px-6">
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
          <div className="belajar-progress-track" role="progressbar">
            <div
              className="belajar-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="max-w-xl space-y-2">
            <label
              htmlFor="preview-student"
              className="block text-sm font-semibold text-[#5c6b73]"
            >
              Nama murid
            </label>
            {students.length > 0 ? (
              <select
                id="preview-student"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="min-h-12 w-full rounded-xl border-2 border-[var(--belajar-line,#c5d4cc)] bg-white px-3 text-lg font-semibold text-[#1f2933] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#0b6e4f] sm:min-h-14 sm:text-xl"
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

        <div
          ref={bookRef}
          className="belajar-book"
          role="region"
          aria-label="Pratinjau halaman — geser ke samping"
        >
          {resolvedPages.map(({ page, media }) => (
            <article key={page.id} className="belajar-book__page">
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
                  <div className="belajar-page-card flex flex-col justify-center p-4 sm:p-5">
                    <p className="whitespace-pre-wrap text-2xl leading-relaxed text-[#1f2933] sm:text-3xl">
                      {page.bodyText?.trim()
                        ? page.bodyText
                        : "Halaman ini belum ada teks."}
                    </p>
                  </div>
                </div>
                {media.storyAudios.length > 0 || media.storyImages.length > 0 ? (
                  <div className="belajar-page-card space-y-4 p-4 sm:p-5">
                    <p className="text-sm font-semibold tracking-wide text-[#5c6b73] uppercase">
                      Cerita
                    </p>
                    {media.storyAudios.map((audio) => (
                      <PageAudioButton key={audio.id} audio={audio} />
                    ))}
                    {media.storyImages.map((image) => (
                      <PageImage key={image.id} image={image} variant="story" />
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <nav className="belajar-nav-sticky" aria-label="Navigasi pratinjau">
          <div className="flex flex-col gap-3 px-4 sm:flex-row sm:justify-center sm:gap-4 sm:px-6">
            <button
              type="button"
              onClick={() => scrollToPage(pageIndex - 1)}
              disabled={pageIndex === 0}
              className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-[var(--belajar-line,#c5d4cc)] bg-white px-6 py-3 text-xl font-semibold text-[#1f2933] disabled:opacity-40 sm:w-auto sm:min-w-[10rem] sm:text-2xl"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => scrollToPage(pageIndex + 1)}
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
