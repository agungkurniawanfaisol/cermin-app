"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  endLearningSession,
  updateSessionStudent,
  type SessionForReader,
  type SessionReaderPage,
} from "@/server/actions/sessions";
import { ChangeStoryDialog } from "./change-story-dialog";
import { EvaluationPanel } from "./evaluation-panel";
import { ObservationPanel } from "./observation-panel";
import { PageAudioButton, PageImage } from "./page-media";

/** Ambang geser horizontal (px) — seperti membuka halaman buku. */
const SWIPE_THRESHOLD_PX = 56;

const TEXT_SIZE_CLASS: Record<
  SessionForReader["preference"]["textSize"],
  string
> = {
  SM: "text-xl leading-relaxed sm:text-2xl",
  MD: "text-2xl leading-relaxed sm:text-3xl",
  LG: "text-3xl leading-relaxed sm:text-4xl",
  XL: "text-4xl leading-relaxed sm:text-5xl",
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function StoryPageSlide({
  page,
  studentId,
  bodyClass,
  showAudio,
}: {
  page: SessionReaderPage;
  studentId: string;
  bodyClass: string;
  showAudio: boolean;
}) {
  return (
    <article className="belajar-book__page" aria-label="Halaman cerita">
      <div className="flex flex-col gap-4 px-4 pb-4 pt-1 sm:gap-5 sm:px-6 md:px-8 lg:px-10">
        <div className="grid gap-4 md:grid-cols-2 md:items-stretch md:gap-6">
          <div className="belajar-portrait p-3 sm:p-4">
            {page.portraitImage ? (
              <PageImage
                key={`${page.portraitImage.id}-${studentId}`}
                image={page.portraitImage}
                variant="portrait"
              />
            ) : (
              <p
                className="max-w-xs text-center text-base text-[var(--belajar-quiet,#5c6b73)]"
                role="status"
              >
                Belum ada foto murid untuk halaman ini.
              </p>
            )}
          </div>

          <div className="belajar-page-card flex flex-col justify-center gap-4 p-4 sm:p-5 md:p-6">
            <p
              className={`whitespace-pre-wrap text-[var(--belajar-ink,#1f2933)] ${bodyClass}`}
            >
              {page.bodyText?.trim()
                ? page.bodyText
                : "Halaman ini belum ada teks."}
            </p>
          </div>
        </div>

        {(showAudio && page.storyAudios.length > 0) ||
        page.storyImages.length > 0 ? (
          <div className="belajar-page-card space-y-4 p-4 sm:p-5">
            <p className="text-sm font-semibold tracking-wide text-[var(--belajar-quiet,#5c6b73)] uppercase">
              Cerita
            </p>
            {showAudio
              ? page.storyAudios.map((audio) => (
                  <PageAudioButton key={audio.id} audio={audio} />
                ))
              : null}
            {page.storyImages.map((image) => (
              <PageImage key={image.id} image={image} variant="story" />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function SessionReader({ session }: { session: SessionForReader }) {
  const router = useRouter();
  const bookRef = useRef<HTMLDivElement>(null);
  const pageIndexRef = useRef(0);
  const swipeOrigin = useRef<{ x: number; y: number; id: number } | null>(
    null,
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [readingDone, setReadingDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [studentPending, startStudentTransition] = useTransition();
  const ended = Boolean(session.endedAt);
  const adultRef = useRef<HTMLDivElement>(null);

  const pages = session.pages;
  const total = pages.length;
  const bodyClass = TEXT_SIZE_CLASS[session.preference.textSize];
  const showAudio = session.preference.audioEnabled;
  const progressPct = total > 0 ? ((pageIndex + 1) / total) * 100 : 0;

  useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);

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

  const goPrev = useCallback(() => {
    scrollToPage(pageIndexRef.current - 1);
  }, [scrollToPage]);

  const goNext = useCallback(() => {
    if (pageIndexRef.current >= total - 1) return;
    scrollToPage(pageIndexRef.current + 1);
  }, [scrollToPage, total]);

  function onBookPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Abaikan kontrol interaktif (select, audio, link).
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, select, input, textarea, audio, label")) {
      return;
    }
    swipeOrigin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }

  function onBookPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const origin = swipeOrigin.current;
    if (!origin || origin.id !== e.pointerId) return;
    swipeOrigin.current = null;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (Math.abs(dx) < Math.abs(dy)) return; // scroll vertikal halaman
    if (dx < 0) goNext();
    else goPrev();
  }

  function onBookPointerCancel() {
    swipeOrigin.current = null;
  }

  function onFinishStory() {
    setReadingDone(true);
    requestAnimationFrame(() => {
      adultRef.current?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    });
  }

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

  useEffect(() => {
    function onResize() {
      const el = bookRef.current;
      if (!el) return;
      el.scrollTo({ left: el.clientWidth * pageIndex, behavior: "auto" });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pageIndex]);

  function onChangeStudent(studentId: string) {
    if (studentId === session.student.id || ended) return;
    setError(null);
    startStudentTransition(async () => {
      const result = await updateSessionStudent({
        sessionId: session.id,
        studentId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onEndSession() {
    if (!window.confirm("Akhiri sesi belajar ini?")) return;
    setError(null);
    startTransition(async () => {
      const result = await endLearningSession({ sessionId: session.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (total === 0) {
    return (
      <main className="mx-auto flex min-h-dvh w-full flex-col px-4 py-8 sm:px-6">
        <p className="text-lg text-[var(--belajar-quiet,#5c6b73)]">
          Cerita ini belum punya halaman.
        </p>
        <Link
          href="/dashboard/sesi"
          className="mt-6 text-[var(--belajar-accent,#3d7c6b)] underline underline-offset-2"
        >
          Kembali ke Sesi
        </Link>
      </main>
    );
  }

  const isLastPage = pageIndex >= total - 1;

  return (
    <main className="w-full">
      <div className="belajar-stage w-full">
        <header className="belajar-stage__header shrink-0 space-y-2 px-4 pt-3 sm:space-y-3 sm:px-6 sm:pt-4 md:px-8 lg:px-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-[var(--belajar-accent-soft,#e6f2ee)] px-2.5 py-1 text-xs font-semibold tracking-wide text-[var(--belajar-accent,#3d7c6b)] uppercase sm:text-sm">
                  {session.story.categoryName}
                </span>
                <span className="text-xs text-[var(--belajar-quiet,#5c6b73)] sm:text-sm">
                  · Cerita Sosial
                </span>
              </div>
              <h1 className="mt-0.5 truncate text-xl font-semibold text-[var(--belajar-ink,#1f2933)] sm:text-2xl md:text-3xl">
                {session.story.title}
              </h1>
              {ended ? (
                <p className="mt-1 text-base text-[var(--belajar-quiet,#5c6b73)]">
                  Bersama {session.student.displayName} · Sesi selesai
                </p>
              ) : null}
            </div>
            <p
              className="shrink-0 rounded-full bg-[var(--belajar-accent-soft,#e6f2ee)] px-3 py-1 text-sm font-semibold text-[var(--belajar-accent,#3d7c6b)] sm:text-base"
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
          <div className="max-w-xl space-y-2">
            <label
              htmlFor="belajar-student"
              className="block text-sm font-semibold text-[var(--belajar-quiet,#5c6b73)] sm:text-base"
            >
              Nama murid
            </label>
            <select
              id="belajar-student"
              value={session.student.id}
              disabled={
                ended || studentPending || session.studentOptions.length === 0
              }
              onChange={(e) => onChangeStudent(e.target.value)}
              className="min-h-12 w-full rounded-xl border-2 border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-page,#fff)] px-3 text-lg font-semibold text-[var(--belajar-ink,#1f2933)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)] disabled:opacity-60 sm:min-h-14 sm:rounded-2xl sm:px-4 sm:text-xl"
            >
              {session.studentOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                </option>
              ))}
            </select>
            {studentPending ? (
              <p
                className="text-sm text-[var(--belajar-quiet,#5c6b73)]"
                role="status"
              >
                Mengganti murid…
              </p>
            ) : null}
          </div>
          <p className="text-sm text-[var(--belajar-quiet,#5c6b73)] sm:text-base">
            Geser ke samping seperti membuka buku, atau pakai tombol di bawah.
          </p>
        </header>

        <div
          ref={bookRef}
          className="belajar-book"
          role="region"
          aria-roledescription="carousel"
          aria-label="Halaman cerita — geser ke samping"
          onPointerDown={onBookPointerDown}
          onPointerUp={onBookPointerUp}
          onPointerCancel={onBookPointerCancel}
        >
          {pages.map((page) => (
            <StoryPageSlide
              key={page.id}
              page={page}
              studentId={session.student.id}
              bodyClass={bodyClass}
              showAudio={showAudio}
            />
          ))}
        </div>

        <nav className="belajar-nav-sticky w-full" aria-label="Navigasi halaman">
          <div className="flex flex-row items-center justify-center gap-2 px-4 sm:gap-3 sm:px-6 md:px-8 lg:px-10">
            <button
              type="button"
              onClick={goPrev}
              disabled={pageIndex === 0}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-page,#fff)] px-3 py-2 text-base font-semibold text-[var(--belajar-ink,#1f2933)] hover:bg-[var(--belajar-accent-soft,#e6f2ee)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)] disabled:opacity-40 sm:max-w-[12rem] sm:flex-none sm:px-4"
            >
              <ChevronLeft className="size-5 shrink-0" aria-hidden />
              Sebelumnya
            </button>
            {isLastPage ? (
              <button
                type="button"
                onClick={onFinishStory}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[var(--belajar-accent,#3d7c6b)] bg-[var(--belajar-accent,#3d7c6b)] px-3 py-2 text-base font-semibold text-white hover:bg-[#34695b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)] sm:max-w-[14rem] sm:flex-none sm:px-4"
              >
                Selesaikan Cerita
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--belajar-accent,#3d7c6b)] bg-[var(--belajar-accent,#3d7c6b)] px-3 py-2 text-base font-semibold text-white hover:bg-[#34695b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)] sm:max-w-[12rem] sm:flex-none sm:px-4"
              >
                Berikutnya
                <ChevronRight className="size-5 shrink-0" aria-hidden />
              </button>
            )}
          </div>
        </nav>
      </div>

      <div
        ref={adultRef}
        className="belajar-adult w-full px-4 py-8 sm:px-6 md:px-8 lg:px-10"
      >
        {readingDone ? (
          <div
            className="belajar-page-card mb-6 p-5 text-center sm:p-6"
            role="status"
          >
            <p className="text-xl font-semibold text-[var(--belajar-ink,#1f2933)] sm:text-2xl">
              Cerita selesai. Terima kasih sudah membaca bersama.
            </p>
            <p className="mt-2 text-base text-[var(--belajar-quiet,#5c6b73)]">
              Orang dewasa dapat mencatat observasi atau evaluasi di bawah, lalu
              mengakhiri sesi.
            </p>
          </div>
        ) : null}

        <p className="mb-4 text-sm font-semibold tracking-wide text-[var(--belajar-quiet,#5c6b73)] uppercase">
          Untuk orang dewasa
        </p>

        <div className="mb-6 flex flex-col gap-3 text-base sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Link
            href="/dashboard/sesi"
            className="inline-flex min-h-11 items-center text-[var(--belajar-quiet,#5c6b73)] underline underline-offset-2 hover:text-[var(--belajar-accent,#3d7c6b)]"
          >
            Kembali ke dasbor
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {!ended ? (
              <ChangeStoryDialog
                studentId={session.student.id}
                currentStoryId={session.story.id}
                stories={session.availableStories ?? []}
              />
            ) : null}
            {!ended ? (
              <button
                type="button"
                onClick={onEndSession}
                disabled={pending}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-page,#fff)] px-4 font-semibold text-[var(--belajar-quiet,#5c6b73)] hover:bg-[var(--belajar-accent-soft,#e6f2ee)] disabled:opacity-50 sm:w-auto"
              >
                {pending ? "Mengakhiri…" : "Akhiri sesi"}
              </button>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="mb-4 text-center text-[#9b2c2c]" role="alert">
            {error}
          </p>
        ) : null}

        <ObservationPanel
          sessionId={session.id}
          observations={session.observations}
          disabled={ended}
        />

        <EvaluationPanel sessionId={session.id} disabled={ended} />
      </div>
    </main>
  );
}
