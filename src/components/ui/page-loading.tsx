import { cn } from "cn";
import "./page-loading.css";

type PageLoadingProps = {
  /** Teks status, contoh: "Memuat sesi…" */
  message?: string;
  /**
   * `page` — skeleton dasbor penuh.
   * `inline` — pesan + indikator di area konten.
   * `belajar` — child mode, lebih tenang & besar.
   */
  variant?: "page" | "inline" | "belajar";
  className?: string;
};

function SoftDots({ className }: { className?: string }) {
  return (
    <span className={cn("cermin-pl-dots", className)} aria-hidden>
      <span className="cermin-pl-dot" />
      <span className="cermin-pl-dot" />
      <span className="cermin-pl-dot" />
    </span>
  );
}

function ProgressBar() {
  return (
    <div className="cermin-pl-bar" aria-hidden>
      <span className="cermin-pl-bar-fill" />
    </div>
  );
}

function StoryMark() {
  return (
    <div className="cermin-pl-orb-wrap" aria-hidden>
      <span className="cermin-pl-ring" />
      <div className="cermin-pl-book" />
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("cermin-pl-shimmer", className)} aria-hidden />;
}

/**
 * Fallback Suspense / route loading.
 * Motion thesis: cerita sedang dibuka — buku lembut, titik, bar, shimmer kertas.
 */
export function PageLoading({
  message = "Memuat…",
  variant = "inline",
  className,
}: PageLoadingProps) {
  if (variant === "belajar") {
    return (
      <main
        className={cn(
          "cermin-pl-root flex flex-1 flex-col items-center justify-center gap-5 px-4 py-16 font-sans sm:px-6",
          className,
        )}
        aria-busy="true"
        aria-live="polite"
        aria-label={message}
      >
        <StoryMark />
        <p className="text-center text-lg text-[var(--cermin-muted,#5c6b73)]">
          {message}
        </p>
        <SoftDots />
      </main>
    );
  }

  if (variant === "page") {
    return (
      <main
        className={cn(
          "cermin-pl-root w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10",
          className,
        )}
        aria-busy="true"
        aria-live="polite"
        aria-label={message}
      >
        <div className="flex w-full items-center gap-3">
          <StoryMark />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-[var(--cermin-muted,#5c6b73)]">
                {message}
              </p>
              <SoftDots />
            </div>
            <ProgressBar />
          </div>
        </div>

        <div className="cermin-pl-shimmer-muted mt-6 h-3 w-full" aria-hidden />
        <div className="cermin-pl-shimmer-muted mt-3 h-9 w-full" aria-hidden />
        <div className="cermin-pl-shimmer mt-2 h-4 w-full" aria-hidden />

        <div className="mt-8 w-full space-y-3">
          <SkeletonBlock className="h-24 w-full" />
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
          </div>
          <SkeletonBlock className="h-40 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main
      className={cn(
        "cermin-pl-root flex w-full flex-1 flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-10",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flex w-full items-center gap-4">
        <StoryMark />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <p className="text-[var(--cermin-muted,#5c6b73)]">{message}</p>
            <SoftDots />
          </div>
          <ProgressBar />
        </div>
      </div>
      <SkeletonBlock className="h-28 w-full" />
      <div className="grid w-full gap-3 sm:grid-cols-2">
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-24 w-full" />
      </div>
    </main>
  );
}
