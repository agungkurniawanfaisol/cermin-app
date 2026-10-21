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
import { PageMcqBlock } from "./page-mcq";
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

function resolvePortrait(
  page: SessionReaderPage,
  studentId: string,
): SessionReaderPage["portraitImage"] {
  return page.portraitsByStudentId[studentId] ?? null;
}

function StoryPageSlide({
  page,
  sessionId,
  studentId,
  bodyClass,
  showAudio,
  sessionEnded,
}: {
  page: SessionReaderPage;
  sessionId: string;
  studentId: string;
  bodyClass: string;
  showAudio: boolean;
  sessionEnded: boolean;
}) {
  const portrait = resolvePortrait(page, studentId);
  const hasStoryMedia =
    page.storyImages.length > 0 ||
    (showAudio && page.storyAudios.length > 0);

  return (
    <article className="belajar-book__page" aria-label="Halaman cerita">
      <div className="flex flex-col gap-3 px-3 pb-3 pt-1 sm:gap-4 sm:px-5 md:px-8 lg:px-10">
        <div className="grid gap-3 md:grid-cols-2 md:items-stretch md:gap-5">
          <div className="belajar-portrait p-2 sm:p-3">
            {portrait ? (
              <PageImage
                key={`${portrait.id}-${studentId}`}
                image={portrait}
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

          <div className="belajar-page-card flex flex-col justify-center gap-3 p-4 sm:p-5 md:p-6">
            <p
              className={`whitespace-pre-wrap text-[var(--belajar-ink,#1f2933)] ${bodyClass}`}
            >
              {page.bodyText?.trim()
                ? page.bodyText
                : "Halaman ini belum ada teks."}
            </p>
          </div>
        </div>

        {hasStoryMedia ? (
          <div className="belajar-page-card space-y-3 p-3 sm:p-4">
            {page.storyImages.map((image) => (
              <PageImage key={image.id} image={image} variant="story" />
            ))}
            {showAudio
              ? page.storyAudios.map((audio) => (
                  <PageAudioButton key={audio.id} audio={audio} />
                ))
              : null}
          </div>
        ) : null}

        {page.mcq ? (
          <PageMcqBlock
            sessionId={sessionId}
            studentId={studentId}
            mcq={page.mcq}
            disabled={sessionEnded}
          />
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
  /** Lokal dulu — ganti nama instan tanpa tunggu router.refresh. */
  const [studentId, setStudentId] = useState(session.student.id);
  const ended = Boolean(session.endedAt);
  const adultRef = useRef<HTMLDivElement>(null);

  const selectedStudentName =
    session.studentOptions.find((s) => s.id === studentId)?.displayName ??
    session.student.displayName;

  const pages = session.pages;
  const total = pages.length;
  const bodyClass = TEXT_SIZE_CLASS[session.preference.textSize];
  const showAudio = session.preference.audioEnabled;
  const progressPct = total > 0 ? ((pageIndex + 1) / total) * 100 : 0;

  useEffect(() => {
    setStudentId(session.student.id);
  }, [session.student.id]);

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

  function onChangeStudent(nextStudentId: string) {
    if (nextStudentId === studentId || ended) return;
    const previousId = studentId;
    setError(null);
    setStudentId(nextStudentId);
    startStudentTransition(async () => {
      const result = await updateSessionStudent({
        sessionId: session.id,
        studentId: nextStudentId,
      });
      if (!result.ok) {
        setStudentId(previousId);
        setError(result.error);
      }
      // Tanpa router.refresh — foto sudah dari portraitsByStudentId lokal.
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
        <header className="belajar-stage__header shrink-0 space-y-1.5 px-3 pt-2 sm:px-5 sm:pt-3 md:px-8 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--belajar-quiet,#5c6b73)]">
                {session.story.categoryName}
              </p>
              <h1 className="truncate text-lg font-semibold text-[var(--belajar-ink,#1f2933)] sm:text-xl md:text-2xl">
                {session.story.title}
              </h1>
            </div>
            <p
              className="shrink-0 rounded-full bg-[var(--belajar-accent-soft,#e6f2ee)] px-2.5 py-0.5 text-sm font-semibold text-[var(--belajar-accent,#3d7c6b)]"
              aria-live="polite"
            >
              {pageIndex + 1}/{total}
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
          <div className="flex max-w-md items-center gap-2">
            <label
              htmlFor="belajar-student"
              className="shrink-0 text-sm font-medium text-[var(--belajar-quiet,#5c6b73)]"
            >
              Murid
            </label>
            <select
              id="belajar-student"
              value={studentId}
              disabled={ended || session.studentOptions.length === 0}
              onChange={(e) => onChangeStudent(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-page,#fff)] px-2.5 text-base font-semibold text-[var(--belajar-ink,#1f2933)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)] disabled:opacity-60"
            >
              {session.studentOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                </option>
              ))}
            </select>
            {studentPending ? (
              <span className="sr-only" role="status">
                Menyimpan nama murid…
              </span>
            ) : null}
          </div>
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
              sessionId={session.id}
              studentId={studentId}
              bodyClass={bodyClass}
              showAudio={showAudio}
              sessionEnded={ended}
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
                studentId={studentId}
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
          studentId={studentId}
          studentName={selectedStudentName}
          observations={session.observations}
          disabled={ended}
        />

        <EvaluationPanel
          sessionId={session.id}
          studentId={studentId}
          studentName={selectedStudentName}
          disabled={ended}
        />
      </div>
    </main>
  );
}
