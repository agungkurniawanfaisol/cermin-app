"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
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
import { PageAudioDock, PageImage } from "./page-media";

const TEXT_SIZE_CLASS: Record<
  SessionForReader["preference"]["textSize"],
  string
> = {
  SM: "text-base sm:text-lg md:text-xl leading-relaxed",
  MD: "text-lg sm:text-xl md:text-2xl leading-relaxed",
  LG: "text-xl sm:text-2xl md:text-3xl leading-relaxed",
  XL: "text-2xl sm:text-3xl md:text-4xl leading-relaxed",
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
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
  studentId,
  bodyClass,
  onScrollToMcq,
}: {
  page: SessionReaderPage;
  studentId: string;
  bodyClass: string;
  onScrollToMcq?: () => void;
}) {
  const portrait = resolvePortrait(page, studentId);

  return (
    <div className="grid flex-1 min-h-0 grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-2 sm:gap-3 md:gap-5 px-3 sm:px-5 md:px-8 py-2 overflow-hidden items-stretch">
      <div className="belajar-portrait flex h-full min-h-0 items-center justify-center p-2 sm:p-3 overflow-hidden">
        {portrait ? (
          <PageImage
            key={`${portrait.id}-${studentId}`}
            image={portrait}
            variant="portrait"
          />
        ) : (
          <p
            className="max-w-xs text-center text-xs sm:text-sm md:text-base text-[var(--belajar-quiet,#5c6b73)]"
            role="status"
          >
            Belum ada foto murid untuk halaman ini.
          </p>
        )}
      </div>

      <div className="belajar-page-card flex h-full min-h-0 flex-col justify-center items-center p-3 sm:p-5 md:p-6 overflow-y-auto">
        <p
          className={`belajar-body-text whitespace-pre-wrap text-[var(--belajar-ink,#1f2933)] text-center ${bodyClass}`}
        >
          {page.bodyText?.trim()
            ? page.bodyText
            : "Halaman ini belum ada teks."}
        </p>
        {page.storyImages.length > 0 ? (
          <div className="w-full space-y-2 pt-2">
            {page.storyImages.map((image) => (
              <PageImage key={image.id} image={image} variant="story" />
            ))}
          </div>
        ) : null}

        {page.mcq && onScrollToMcq ? (
          <div className="mt-3 sm:mt-4 flex w-full max-w-sm flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-accent-soft,#e6f2ee)] p-2.5 sm:p-3 text-center shrink-0">
            <p className="text-xs sm:text-sm font-semibold text-[var(--belajar-ink,#1f2933)]">
              Ada pertanyaan untukmu di bawah!
            </p>
            <button
              type="button"
              onClick={onScrollToMcq}
              className="inline-flex min-h-10 sm:min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--belajar-accent,#3d7c6b)] px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-[#34695b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)] shadow-xs transition-colors cursor-pointer"
            >
              <ChevronDown className="size-4 sm:size-5 shrink-0" aria-hidden />
              <span>Klik ke Bawah untuk Menjawab</span>
            </button>
            <span className="text-[11px] sm:text-xs text-[var(--belajar-quiet,#5c6b73)]">
              Atau geser layar ke bawah
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SessionReader({ session }: { session: SessionForReader }) {
  const router = useRouter();
  const pageIndexRef = useRef(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [readingDone, setReadingDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [studentPending, startStudentTransition] = useTransition();
  /** Lokal dulu — ganti nama instan tanpa tunggu router.refresh. */
  const [studentId, setStudentId] = useState(session.student.id);
  const ended = Boolean(session.endedAt);
  const containerRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const mcqRef = useRef<HTMLElement>(null);
  const adultRef = useRef<HTMLElement>(null);

  const selectedStudentName =
    session.studentOptions.find((s) => s.id === studentId)?.displayName ??
    session.student.displayName;

  const pages = session.pages;
  const total = pages.length;
  const currentPage = pages[pageIndex] ?? null;
  const bodyClass = TEXT_SIZE_CLASS[session.preference.textSize];
  const showAudio = session.preference.audioEnabled;
  const progressPct = total > 0 ? ((pageIndex + 1) / total) * 100 : 0;

  useEffect(() => {
    setStudentId(session.student.id);
  }, [session.student.id]);

  useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);

  /** Satu halaman aktif: reset scroll kontainer dan window ke atas. */
  const goToPage = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(total - 1, index));
      setPageIndex(next);
      const behavior = prefersReducedMotion() ? "auto" : "smooth";
      containerRef.current?.scrollTo({ top: 0, behavior });
      window.scrollTo({ top: 0, behavior });
    },
    [total],
  );

  const goPrev = useCallback(() => {
    goToPage(pageIndexRef.current - 1);
  }, [goToPage]);

  const goNext = useCallback(() => {
    if (pageIndexRef.current >= total - 1) return;
    goToPage(pageIndexRef.current + 1);
  }, [goToPage, total]);

  const scrollToStory = useCallback(() => {
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    if (storyRef.current) {
      storyRef.current.scrollIntoView({ behavior, block: "start" });
    } else {
      containerRef.current?.scrollTo({ top: 0, behavior });
      window.scrollTo({ top: 0, behavior });
    }
  }, []);

  const scrollToMcq = useCallback(() => {
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    mcqRef.current?.scrollIntoView({ behavior, block: "start" });
  }, []);

  const scrollToAdult = useCallback(() => {
    setReadingDone(true);
    requestAnimationFrame(() => {
      adultRef.current?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    });
  }, []);

  function onFinishStory() {
    setReadingDone(true);
    requestAnimationFrame(() => {
      adultRef.current?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    });
  }

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
    <main
      ref={containerRef}
      className="belajar-viewport-container w-full"
    >
      {/* SCREEN 1: Layar Cerita Utama (Strictly 100dvh di HP Landscape & Tablet Landscape) */}
      <section
        ref={storyRef}
        aria-label="Layar cerita"
        className="belajar-snap-page flex h-dvh max-h-dvh flex-col justify-between overflow-hidden"
      >
        <header className="belajar-stage__header shrink-0 px-3 pt-[max(0.35rem,env(safe-area-inset-top))] pb-1 sm:px-5 sm:pt-2 md:px-8 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] sm:text-xs font-medium text-[var(--belajar-quiet,#5c6b73)]">
                {session.story.categoryName}
              </p>
              <h1 className="truncate text-sm sm:text-base md:text-xl font-semibold text-[var(--belajar-ink,#1f2933)]">
                {session.story.title}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <p
                className="shrink-0 rounded-full bg-[var(--belajar-accent-soft,#e6f2ee)] px-2.5 py-0.5 text-xs sm:text-sm font-semibold text-[var(--belajar-accent,#3d7c6b)]"
                aria-live="polite"
              >
                <span className="sr-only">Halaman {pageIndex + 1} dari {total}</span>
                <span aria-hidden>{pageIndex + 1}/{total}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="belajar-student"
                  className="shrink-0 text-xs sm:text-sm font-medium text-[var(--belajar-quiet,#5c6b73)] hidden sm:inline"
                >
                  Murid:
                </label>
                <select
                  id="belajar-student"
                  value={studentId}
                  disabled={ended || session.studentOptions.length === 0}
                  onChange={(e) => onChangeStudent(e.target.value)}
                  className="h-8 sm:h-9 max-w-[120px] sm:max-w-[180px] truncate rounded-lg border border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-page,#fff)] px-2 text-xs sm:text-sm font-semibold text-[var(--belajar-ink,#1f2933)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)] disabled:opacity-60"
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
            </div>
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
        </header>

        {currentPage ? (
          <StoryPageSlide
            key={currentPage.id}
            page={currentPage}
            studentId={studentId}
            bodyClass={bodyClass}
            onScrollToMcq={scrollToMcq}
          />
        ) : null}

        <nav
          className="belajar-nav-docked shrink-0"
          aria-label="Navigasi halaman"
        >
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-1 sm:px-4">
            <button
              type="button"
              onClick={goPrev}
              disabled={pageIndex === 0}
              className="inline-flex min-h-10 sm:min-h-11 items-center justify-center gap-1 rounded-xl border border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-page,#fff)] px-3 py-1.5 text-xs sm:text-base font-semibold text-[var(--belajar-ink,#1f2933)] hover:bg-[var(--belajar-accent-soft,#e6f2ee)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)] disabled:opacity-40"
            >
              <ChevronLeft className="size-4 sm:size-5 shrink-0" aria-hidden />
              Sebelumnya
            </button>

            <div className="flex items-center gap-2">
              {showAudio && currentPage?.storyAudios.length ? (
                <PageAudioDock audios={currentPage.storyAudios} />
              ) : null}
              {currentPage?.mcq ? (
                <button
                  type="button"
                  onClick={scrollToMcq}
                  className="inline-flex min-h-10 sm:min-h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-[var(--belajar-accent,#3d7c6b)] bg-[var(--belajar-accent-soft,#e6f2ee)] px-3 sm:px-4 py-1.5 text-xs sm:text-sm md:text-base font-bold text-[var(--belajar-accent,#3d7c6b)] hover:bg-[#d8ece4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)] shadow-xs cursor-pointer"
                  aria-label="Klik ke bawah untuk soal pilihan"
                >
                  <ChevronDown className="size-4 sm:size-5 shrink-0" aria-hidden />
                  <span>Klik ke Bawah</span>
                </button>
              ) : isLastPage ? (
                <button
                  type="button"
                  onClick={onFinishStory}
                  className="inline-flex min-h-10 sm:min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--belajar-accent-soft,#e6f2ee)] px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-[var(--belajar-accent,#3d7c6b)] hover:bg-[#d8ece4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)]"
                  aria-label="Selesai membaca, ke catatan sesi di bawah"
                >
                  <ChevronDown className="size-4 shrink-0" aria-hidden />
                  <span>Catatan di Bawah</span>
                </button>
              ) : null}
            </div>

            {isLastPage ? (
              <button
                type="button"
                onClick={onFinishStory}
                className="inline-flex min-h-10 sm:min-h-11 items-center justify-center rounded-xl border border-[var(--belajar-accent,#3d7c6b)] bg-[var(--belajar-accent,#3d7c6b)] px-3 py-1.5 text-xs sm:text-base font-semibold text-white hover:bg-[#34695b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)]"
              >
                Selesaikan Cerita
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex min-h-10 sm:min-h-11 items-center justify-center gap-1 rounded-xl border border-[var(--belajar-accent,#3d7c6b)] bg-[var(--belajar-accent,#3d7c6b)] px-3 py-1.5 text-xs sm:text-base font-semibold text-white hover:bg-[#34695b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)]"
              >
                Berikutnya
                <ChevronRight className="size-4 sm:size-5 shrink-0" aria-hidden />
              </button>
            )}
          </div>
        </nav>
      </section>

      {/* SCREEN 2: Layar Soal Pilihan Ganda (Conditional snap page) */}
      {currentPage?.mcq ? (
        <section
          ref={mcqRef}
          aria-label="Layar soal pilihan"
          className="belajar-snap-page flex h-dvh min-h-dvh max-h-dvh flex-col justify-between items-center p-3 sm:p-5 md:p-6 bg-[var(--belajar-ground)] overflow-y-auto"
        >
          <div className="w-full max-w-2xl flex flex-1 flex-col justify-between gap-2.5 sm:gap-3 my-auto">
            {/* Top navigation bar within Screen 2 */}
            <div className="flex w-full items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={scrollToStory}
                className="inline-flex min-h-9 sm:min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-page,#fff)] px-3 py-1.5 text-xs sm:text-sm font-semibold text-[var(--belajar-quiet,#5c6b73)] hover:bg-[var(--belajar-accent-soft,#e6f2ee)] hover:text-[var(--belajar-accent,#3d7c6b)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)]"
              >
                <ChevronUp className="size-4 shrink-0" aria-hidden />
                <span>Kembali ke cerita</span>
              </button>

              <button
                type="button"
                onClick={scrollToAdult}
                className="inline-flex min-h-9 sm:min-h-10 items-center justify-center gap-1.5 rounded-lg border-2 border-[var(--belajar-accent,#3d7c6b)] bg-[var(--belajar-accent-soft,#e6f2ee)] px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold text-[var(--belajar-accent,#3d7c6b)] hover:bg-[#d8ece4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)] shadow-xs cursor-pointer"
                aria-label="Klik ke bawah untuk catatan sesi"
              >
                <ChevronDown className="size-4 shrink-0" aria-hidden />
                <span>Catatan di Bawah</span>
              </button>

              {isLastPage ? (
                <button
                  type="button"
                  onClick={onFinishStory}
                  className="inline-flex min-h-9 sm:min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[var(--belajar-accent,#3d7c6b)] px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#34695b]"
                >
                  <span>Selesaikan Cerita</span>
                  <ChevronDown className="size-4 shrink-0" aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex min-h-9 sm:min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[var(--belajar-accent,#3d7c6b)] px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#34695b]"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="size-4 shrink-0" aria-hidden />
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0 flex flex-col justify-center">
              <PageMcqBlock
                sessionId={session.id}
                studentId={studentId}
                mcq={currentPage.mcq}
                disabled={ended}
              />
            </div>

            {/* Bottom prompt card & downward button on Screen 2 */}
            <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-2 rounded-2xl border-2 border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-accent-soft,#e6f2ee)] p-2.5 sm:p-3 text-center shrink-0">
              <button
                type="button"
                onClick={scrollToAdult}
                className="inline-flex min-h-10 sm:min-h-11 w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-[var(--belajar-accent,#3d7c6b)] px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-[#34695b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)] shadow-xs transition-colors cursor-pointer"
                aria-label="Klik ke bawah untuk catatan sesi orang dewasa"
              >
                <ChevronDown className="size-4 sm:size-5 shrink-0" aria-hidden />
                <span>{isLastPage ? "Selesai & Ke Catatan di Bawah" : "Klik ke Bawah untuk Catatan Sesi"}</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs text-[var(--belajar-quiet,#5c6b73)]">
                  Atau geser layar ke bawah
                </span>
                {!isLastPage ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex min-h-9 sm:min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-page,#fff)] px-3 py-1.5 text-xs sm:text-sm font-semibold text-[var(--belajar-ink,#1f2933)] hover:bg-[var(--belajar-accent-soft,#e6f2ee)] cursor-pointer"
                  >
                    <span>Halaman Berikutnya</span>
                    <ChevronRight className="size-4 shrink-0" aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* SCREEN 3: Layar Orang Dewasa */}
      <section
        ref={adultRef}
        aria-label="Untuk orang dewasa"
        className="belajar-snap-page min-h-dvh flex flex-col p-4 sm:p-6 md:p-8 lg:p-10 bg-[var(--belajar-ground)] overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-4xl flex flex-col gap-4 pb-12">
          <div className="flex justify-start">
            <button
              type="button"
              onClick={scrollToStory}
              className="inline-flex min-h-9 sm:min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-page,#fff)] px-3 py-1.5 text-xs sm:text-sm font-semibold text-[var(--belajar-quiet,#5c6b73)] hover:bg-[var(--belajar-accent-soft,#e6f2ee)] hover:text-[var(--belajar-accent,#3d7c6b)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)]"
            >
              <span aria-hidden>↑</span>
              <span>Kembali ke cerita</span>
            </button>
          </div>

          {readingDone ? (
            <div
              className="belajar-page-card p-5 text-center sm:p-6"
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

          <p className="text-sm font-semibold tracking-wide text-[var(--belajar-quiet,#5c6b73)] uppercase">
            Untuk orang dewasa
          </p>

          <div className="flex flex-col gap-3 text-base sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
            <p className="text-center text-[#9b2c2c]" role="alert">
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
      </section>
    </main>
  );
}
