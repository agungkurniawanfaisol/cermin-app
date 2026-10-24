"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, ChevronLeft, ChevronRight, Loader2, Play } from "lucide-react";
import {
  startLearningSession,
  type PublishedStoryOption,
} from "@/server/actions/sessions";
import { Button } from "@/components/ui/button";

/** Kolom dan baris grid wizard berdasarkan viewport. */
type SessionViewportConfig = {
  storyCols: number;
  storyRows: number;
  isShortLandscape: boolean;
};

function useSessionViewportConfig(): SessionViewportConfig {
  const [config, setConfig] = useState<SessionViewportConfig>({
    storyCols: 2,
    storyRows: 2,
    isShortLandscape: false,
  });

  useEffect(() => {
    function read() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isLandscape =
        (typeof window.matchMedia === "function" &&
          window.matchMedia("(orientation: landscape)").matches) ||
        (w > 0 && h > 0 && w > h);
      const isShortLandscape = isLandscape && h <= 540;

      let storyCols = 2;
      let storyRows = 2;

      if (isShortLandscape) {
        storyRows = 1;
        if (w >= 800) storyCols = 3;
        else storyCols = 2;
      } else {
        if (w >= 1280) storyCols = 4;
        else if (w >= 768) storyCols = 3;
        else storyCols = 2;
      }

      setConfig({ storyCols, storyRows, isShortLandscape });
    }
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  return config;
}

type StudentOption = { id: string; displayName: string };

type WizardStep = "category" | "story" | "preview";

type CategoryCard = {
  id: string;
  name: string;
  description: string | null;
  coverUrl?: string | null;
  storyCount: number;
};

function isWizardStep(value: string | null): value is WizardStep {
  return value === "category" || value === "story" || value === "preview";
}

function readWizardFromLocation(pathname: string): {
  step: WizardStep;
  studentId: string;
  categoryId: string;
  storyId: string;
} {
  if (typeof window === "undefined") {
    return { step: "category", studentId: "", categoryId: "", storyId: "" };
  }
  const params = new URLSearchParams(window.location.search);
  const stepParam = params.get("step");
  return {
    step: isWizardStep(stepParam) ? stepParam : "category",
    studentId: params.get("studentId") ?? "",
    categoryId: params.get("categoryId") ?? "",
    storyId: params.get("storyId") ?? "",
  };
}

function CategoryCoverThumb({
  categoryId,
  coverUrl,
  className,
}: {
  categoryId: string;
  coverUrl?: string | null;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(coverUrl ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (coverUrl !== undefined) {
      setUrl(coverUrl);
      return;
    }
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    void (async () => {
      try {
        const res = await fetch(`/api/category/${categoryId}/cover`, {
          credentials: "same-origin",
        });
        const body = (await res.json()) as { url?: string | null };
        if (cancelled) return;
        if (!res.ok || !body.url) {
          setFailed(true);
          return;
        }
        setUrl(body.url);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId, coverUrl]);

  if (!url && !failed) {
    if (coverUrl === null) {
      return (
        <div
          className={`flex h-full items-center justify-center ${className ?? ""}`}
        >
          <span className="flex size-12 items-center justify-center rounded-xl bg-white text-[var(--cermin-accent,#3d7c6b)] shadow-sm sm:size-14">
            <BookOpen className="size-6 sm:size-7" aria-hidden />
          </span>
        </div>
      );
    }
    return (
      <div
        className={`h-full w-full animate-pulse bg-[var(--accent-soft,#e6f2ee)] ${className ?? ""}`}
        aria-hidden
      />
    );
  }

  if (failed || !url) {
    return (
      <div
        className={`flex h-full items-center justify-center ${className ?? ""}`}
      >
        <span className="flex size-12 items-center justify-center rounded-xl bg-white text-[var(--cermin-accent,#3d7c6b)] shadow-sm sm:size-14">
          <BookOpen className="size-6 sm:size-7" aria-hidden />
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed URL TTL pendek
    <img
      src={url}
      alt=""
      className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${className ?? ""}`}
    />
  );
}

function excerpt(text: string, max = 110): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function CoverThumb({
  mediaId,
  alt,
  compact = false,
  className,
}: {
  mediaId: string;
  alt: string;
  compact?: boolean;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const defaultBox = compact
    ? "h-full w-full rounded-none border-0"
    : "aspect-[4/3] w-full rounded-xl border border-[var(--cermin-border,#d9e2ec)]";
  const box = className ?? defaultBox;
  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    void (async () => {
      try {
        const res = await fetch(`/api/media/${mediaId}`);
        const body = (await res.json()) as { url?: string };
        if (cancelled) return;
        if (!res.ok || !body.url) {
          setFailed(true);
          return;
        }
        setUrl(body.url);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-white text-xs text-[var(--cermin-muted,#5c6b73)] ${box}`}
      >
        Cover tidak tersedia
      </div>
    );
  }
  if (!url) {
    return (
      <div
        className={`animate-pulse bg-[var(--accent-soft,#e6f2ee)] ${box}`}
        aria-hidden
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed URL
    <img src={url} alt={alt} className={`object-cover ${box}`} />
  );
}

function Progress({ step }: { step: WizardStep }) {
  const items: Array<{ id: WizardStep | "session"; label: string }> = [
    { id: "category", label: "Kategori" },
    { id: "story", label: "Cerita" },
    { id: "session", label: "Sesi" },
  ];
  const activeIndex =
    step === "category" ? 0 : step === "story" ? 1 : 2;

  return (
    <ol
      className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 landscape:gap-1"
      aria-label="Progres mulai sesi"
    >
      {items.map((item, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li key={item.id} className="flex items-center gap-1.5 sm:gap-2 landscape:gap-1">
            {index > 0 ? (
              <span
                className="text-[var(--cermin-border,#d9e2ec)] text-xs"
                aria-hidden
              >
                /
              </span>
            ) : null}
            <span
              className={
                active
                  ? "inline-flex items-center gap-1.5 rounded-full bg-[var(--cermin-accent,#3d7c6b)] px-2.5 py-1 text-xs font-semibold text-white sm:text-sm landscape:py-0.5 landscape:px-2 landscape:text-xs"
                  : done
                    ? "inline-flex items-center gap-1.5 text-xs font-medium text-[var(--cermin-accent,#3d7c6b)] sm:text-sm landscape:text-xs"
                    : "inline-flex items-center gap-1.5 text-xs text-[var(--cermin-muted,#5c6b73)] sm:text-sm landscape:text-xs"
              }
              aria-current={active ? "step" : undefined}
            >
              <span
                className={
                  active
                    ? "flex size-5 items-center justify-center rounded-full bg-white/25 text-[0.65rem] font-bold landscape:size-4"
                    : done
                      ? "flex size-5 items-center justify-center rounded-full bg-[var(--accent-soft,#e6f2ee)] text-[0.65rem] font-bold text-[var(--cermin-accent,#3d7c6b)] landscape:size-4"
                      : "flex size-5 items-center justify-center rounded-full border border-[var(--cermin-border,#d9e2ec)] text-[0.65rem] font-medium landscape:size-4"
                }
                aria-hidden
              >
                {done ? "✓" : index + 1}
              </span>
              {item.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function SessionStartFlow({
  students,
  stories,
  initialStudentId,
  initialStep = "category",
  initialCategoryId = "",
  initialStoryId = "",
  fullscreen = false,
}: {
  students: StudentOption[];
  stories: PublishedStoryOption[];
  /** Murid opsional di URL; jika kosong, default murid pertama saat Memulai. */
  initialStudentId?: string;
  initialStep?: WizardStep;
  initialCategoryId?: string;
  initialStoryId?: string;
  fullscreen?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [starting, setStarting] = useState(false);
  const [storyPage, setStoryPage] = useState(0);
  const [categoryPage, setCategoryPage] = useState(0);
  const viewportConfig = useSessionViewportConfig();
  const storyCols = viewportConfig.storyCols;

  const [wizard, setWizard] = useState({
    step: initialStep,
    studentId: initialStudentId ?? "",
    categoryId: initialCategoryId,
    storyId: initialStoryId,
  });

  const step = wizard.step;
  const categoryIdParam = wizard.categoryId;
  const storyIdParam = wizard.storyId;
  const studentIdParam = wizard.studentId;

  useEffect(() => {
    function onPopState() {
      setWizard(readWizardFromLocation(pathname));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [pathname]);

  useEffect(() => {
    setStoryPage(0);
  }, [categoryIdParam]);

  const studentId = useMemo(() => {
    const candidate = studentIdParam || initialStudentId || "";
    if (students.some((s) => s.id === candidate)) return candidate;
    return students[0]?.id ?? "";
  }, [studentIdParam, initialStudentId, students]);

  const categories = useMemo(() => {
    const map = new Map<string, CategoryCard>();
    for (const s of stories) {
      const existing = map.get(s.categoryId);
      if (existing) {
        existing.storyCount += 1;
        if (!existing.coverUrl && s.categoryCoverUrl) {
          existing.coverUrl = s.categoryCoverUrl;
        }
        continue;
      }
      map.set(s.categoryId, {
        id: s.categoryId,
        name: s.categoryName,
        description: s.categoryDescription,
        coverUrl: s.categoryCoverUrl,
        storyCount: 1,
      });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [stories]);

  const filteredStories = useMemo(
    () => stories.filter((s) => s.categoryId === categoryIdParam),
    [stories, categoryIdParam],
  );

  const selectedCategory = categories.find((c) => c.id === categoryIdParam);
  const selectedStory = stories.find((s) => s.id === storyIdParam) ?? null;

  const isShortLandscape = viewportConfig.isShortLandscape;
  const categoryPageSize = isShortLandscape ? 2 : Math.max(1, categories.length);
  const categoryTotalPages = Math.max(
    1,
    Math.ceil(categories.length / categoryPageSize),
  );
  const safeCategoryPage = Math.min(categoryPage, categoryTotalPages - 1);
  const pagedCategories = isShortLandscape
    ? categories.slice(safeCategoryPage * 2, safeCategoryPage * 2 + 2)
    : categories;

  /** Maks 1 baris di landscape pendek, maks 2 baris di mode lainnya. */
  const storyPageSize = Math.max(
    1,
    viewportConfig.storyCols * viewportConfig.storyRows,
  );
  const storyTotalPages = Math.max(
    1,
    Math.ceil(filteredStories.length / storyPageSize),
  );
  const safeStoryPage = Math.min(storyPage, storyTotalPages - 1);
  const pagedStories = filteredStories.slice(
    safeStoryPage * storyPageSize,
    safeStoryPage * storyPageSize + storyPageSize,
  );
  const storyGridColsClass =
    viewportConfig.storyCols >= 4
      ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
      : viewportConfig.storyCols >= 3
        ? "grid-cols-2 md:grid-cols-3 landscape:grid-cols-3"
        : "grid-cols-2";
  const storyGridRowsClass =
    viewportConfig.storyRows === 1 || pagedStories.length <= viewportConfig.storyCols
      ? "grid-rows-1"
      : "grid-rows-2";

  const replaceQuery = useCallback(
    (patch: Record<string, string | null>) => {
      setWizard((prev) => {
        const next = {
          step: prev.step,
          studentId: prev.studentId,
          categoryId: prev.categoryId,
          storyId: prev.storyId,
        };
        if ("step" in patch) {
          const raw = patch.step;
          next.step = isWizardStep(raw) ? raw : "category";
        }
        if ("studentId" in patch) next.studentId = patch.studentId ?? "";
        if ("categoryId" in patch) next.categoryId = patch.categoryId ?? "";
        if ("storyId" in patch) next.storyId = patch.storyId ?? "";

        const params = new URLSearchParams();
        params.set("step", next.step);
        if (next.studentId) params.set("studentId", next.studentId);
        if (next.categoryId) params.set("categoryId", next.categoryId);
        if (next.storyId) params.set("storyId", next.storyId);
        // Tanpa router.replace — hindari RSC refetch katalog tiap ganti step.
        window.history.pushState(null, "", `${pathname}?${params.toString()}`);
        return next;
      });
    },
    [pathname],
  );

  function onCancel() {
    router.push("/dashboard/sesi");
  }

  async function onStartStory() {
    if (!studentId || !storyIdParam || starting || pending) return;
    setError(null);
    setStarting(true);
    try {
      const result = await startLearningSession({
        studentId,
        storyId: storyIdParam,
      });
      if (!result.ok) {
        setError(result.error);
        setStarting(false);
        return;
      }
      router.push(`/belajar/${result.data.id}`);
    } catch {
      setError("Gagal memulai sesi. Coba lagi.");
      setStarting(false);
    }
  }

  if (students.length === 0) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-4 py-8">
        <p className="rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white/90 px-4 py-6 text-sm text-[var(--cermin-muted,#5c6b73)] shadow-sm backdrop-blur-[2px]">
          Belum ada murid yang dapat Anda akses.
        </p>
        <Link
          href="/dashboard/sesi"
          className="mt-4 text-[var(--cermin-accent,#3d7c6b)] underline-offset-2 hover:underline"
        >
          Kembali ke Sesi
        </Link>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-4 py-8">
        <p className="rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white/90 px-4 py-6 text-sm text-[var(--cermin-muted,#5c6b73)] shadow-sm backdrop-blur-[2px]">
          Belum ada cerita terbit untuk sesi.
        </p>
        <Link
          href="/dashboard/cerita"
          className="mt-4 text-[var(--cermin-accent,#3d7c6b)] underline-offset-2 hover:underline"
        >
          Kelola cerita
        </Link>
      </div>
    );
  }

  const shellClass = fullscreen
    ? "sesi-fullscreen-container mx-auto flex min-h-dvh w-full max-w-[90rem] flex-col justify-between gap-3 px-4 py-3 sm:px-8 sm:py-5 md:px-10 lg:px-16 landscape:h-dvh landscape:max-h-dvh landscape:overflow-hidden landscape:py-2.5 landscape:gap-2"
    : "flex w-full flex-col gap-5 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-4 shadow-sm sm:p-5";

  return (
    <div className={shellClass}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--cermin-border,#d9e2ec)]/80 pb-2.5 sm:pb-4 landscape:pb-1.5">
        <p className="shrink-0 text-xs sm:text-sm font-medium tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
          CERMIN
        </p>
        <div className="min-w-0">
          <Progress step={step} />
        </div>
      </header>

      {step === "category" ? (
        <section
          className="flex min-h-0 flex-1 flex-col justify-between gap-3 sm:gap-6 landscape:gap-2"
          aria-label="Pilih kategori cerita"
        >
          {categories.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-white/80 px-4 py-8 text-center text-sm text-[var(--cermin-muted,#5c6b73)]">
              Tidak ada kategori dengan cerita terbit.
            </p>
          ) : (
            <ul className="grid w-full grid-cols-2 gap-3 sm:gap-7 lg:gap-10 flex-1 min-h-0 landscape:h-full">
              {pagedCategories.map((cat) => (
                <li key={cat.id} className="min-w-0 h-full">
                  <button
                    type="button"
                    onClick={() =>
                      replaceQuery({
                        step: "story",
                        studentId: null,
                        categoryId: cat.id,
                        storyId: null,
                      })
                    }
                    className="group flex w-full cursor-pointer overflow-hidden rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white text-left shadow-[0_10px_28px_-18px_color-mix(in_srgb,var(--cermin-accent,#3d7c6b)_35%,transparent)] transition-[border-color,box-shadow,transform] duration-200 hover:border-[var(--cermin-accent,#3d7c6b)] hover:shadow-[0_14px_32px_-16px_color-mix(in_srgb,var(--cermin-accent,#3d7c6b)_40%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 flex-col sm:min-h-[17rem] md:min-h-[19rem] landscape:flex-row landscape:items-center landscape:min-h-0 landscape:h-full landscape:p-2.5 landscape:gap-3"
                  >
                    <div className="relative h-28 w-full shrink-0 overflow-hidden border-b border-[var(--cermin-border,#d9e2ec)]/70 bg-[var(--accent-soft,#e6f2ee)]/60 sm:h-36 md:h-44 landscape:h-full landscape:w-28 sm:landscape:w-36 landscape:rounded-xl landscape:border-0">
                      <CategoryCoverThumb categoryId={cat.id} coverUrl={cat.coverUrl} />
                    </div>
                    <div className="flex flex-1 flex-col gap-2 px-4 py-4 sm:gap-3 sm:px-7 sm:py-5 landscape:gap-1 landscape:p-1.5 sm:landscape:p-2 landscape:justify-between landscape:h-full landscape:min-w-0">
                      <div className="flex items-start gap-2">
                        <span className="min-w-0 flex-1 text-xl font-semibold leading-snug text-[var(--text,#1f2933)] sm:text-2xl md:text-3xl landscape:text-sm sm:landscape:text-base landscape:font-bold landscape:line-clamp-1">
                          {cat.name}
                        </span>
                        <ChevronRight
                          className="mt-0.5 size-5 shrink-0 text-[var(--cermin-muted,#5c6b73)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--cermin-accent,#3d7c6b)] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 sm:size-6 landscape:size-4"
                          aria-hidden
                        />
                      </div>
                      {cat.description?.trim() ? (
                        <span className="text-sm leading-relaxed text-[var(--cermin-muted,#5c6b73)] line-clamp-3 sm:text-lg landscape:text-xs landscape:line-clamp-2 landscape:leading-snug">
                          {excerpt(cat.description, 180)}
                        </span>
                      ) : null}
                      <span className="mt-auto inline-flex w-fit items-center rounded-full bg-[var(--accent-soft,#e6f2ee)] px-3.5 py-1.5 text-sm font-medium text-[var(--cermin-accent,#3d7c6b)] sm:px-4 sm:text-base landscape:px-2 landscape:py-0.5 landscape:text-[11px] sm:landscape:text-xs">
                        {cat.storyCount} cerita
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-auto flex shrink-0 flex-row items-center justify-between gap-2 border-t border-[var(--cermin-border,#d9e2ec)]/80 pt-2.5 sm:pt-4 landscape:pt-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-10 sm:min-h-11 w-auto bg-white/80"
              onClick={onCancel}
            >
              Batal
            </Button>
            {isShortLandscape && categoryTotalPages > 1 ? (
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 sm:min-h-11 min-w-10 sm:min-w-11 bg-white/80 px-2.5 sm:px-3"
                  disabled={safeCategoryPage <= 0}
                  aria-label="Kategori sebelumnya"
                  onClick={() => setCategoryPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="size-4 sm:size-5" aria-hidden />
                  <span className="sr-only sm:not-sr-only sm:ml-1 text-xs sm:text-sm">Sebelumnya</span>
                </Button>
                <Button
                  type="button"
                  className="min-h-10 sm:min-h-11 min-w-10 sm:min-w-11 px-2.5 sm:px-3"
                  disabled={safeCategoryPage >= categoryTotalPages - 1}
                  aria-label="Kategori berikutnya"
                  onClick={() =>
                    setCategoryPage((p) => Math.min(categoryTotalPages - 1, p + 1))
                  }
                >
                  <span className="sr-only sm:not-sr-only sm:mr-1 text-xs sm:text-sm">Berikutnya</span>
                  <ChevronRight className="size-4 sm:size-5" aria-hidden />
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === "story" ? (
        <section
          className="flex min-h-0 flex-1 flex-col justify-between gap-2.5 sm:gap-3 landscape:gap-1.5"
          aria-label={
            selectedCategory
              ? `Pilih cerita: ${selectedCategory.name}`
              : "Pilih cerita"
          }
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
            {selectedCategory ? (
              <p className="inline-flex w-fit items-center rounded-full bg-[var(--accent-soft,#e6f2ee)] px-2.5 py-0.5 text-xs font-medium text-[var(--cermin-accent,#3d7c6b)] sm:px-3 sm:py-1 sm:text-sm">
                {selectedCategory.name}
              </p>
            ) : (
              <span />
            )}
            {storyTotalPages > 1 ? (
              <p className="text-xs sm:text-sm text-[var(--cermin-muted,#5c6b73)]">
                Halaman {safeStoryPage + 1} dari {storyTotalPages}
              </p>
            ) : null}
          </div>

          {filteredStories.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-white/80 px-4 py-8 text-center text-sm text-[var(--cermin-muted,#5c6b73)]">
              Tidak ada cerita terbit di kategori ini.
            </p>
          ) : (
            <ul
              className={`grid min-h-0 flex-1 gap-2.5 sm:gap-4 ${
                filteredStories.length === 1
                  ? "mx-auto w-full max-w-md grid-cols-1 grid-rows-1"
                  : `${storyGridColsClass} ${storyGridRowsClass}`
              }`}
            >
              {pagedStories.map((story) => (
                <li key={story.id} className="min-h-0 min-w-0 h-full">
                  <button
                    type="button"
                    onClick={() =>
                      replaceQuery({
                        step: "preview",
                        studentId: studentIdParam || null,
                        categoryId: categoryIdParam,
                        storyId: story.id,
                      })
                    }
                    className="group flex h-full max-h-full w-full cursor-pointer flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white text-left shadow-[0_8px_22px_-16px_color-mix(in_srgb,var(--cermin-accent,#3d7c6b)_35%,transparent)] transition-[border-color,box-shadow,transform] duration-200 hover:border-[var(--cermin-accent,#3d7c6b)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
                  >
                    <div className="relative h-20 w-full shrink-0 overflow-hidden border-b border-[var(--cermin-border,#d9e2ec)]/70 bg-[var(--accent-soft,#e6f2ee)]/50 sm:h-24 landscape:h-16 sm:landscape:h-20">
                      {story.coverMediaId ? (
                        <CoverThumb
                          mediaId={story.coverMediaId}
                          alt={`Cover ${story.title}`}
                          compact
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-white text-[var(--cermin-accent,#3d7c6b)] shadow-sm landscape:size-8">
                            <BookOpen className="size-4 sm:size-5" aria-hidden />
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between gap-1 p-2 sm:px-4 sm:py-3 landscape:p-1.5 landscape:gap-0.5">
                      <span className="line-clamp-2 text-xs sm:text-base font-semibold leading-snug text-[var(--text,#1f2933)] landscape:text-xs sm:landscape:text-sm">
                        {story.title}
                      </span>
                      <span className="inline-flex w-fit items-center rounded-full bg-[var(--accent-soft,#e6f2ee)] px-2 py-0.5 text-[11px] font-medium text-[var(--cermin-accent,#3d7c6b)] sm:px-2.5 sm:text-xs">
                        {story.pageCount} halaman
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex shrink-0 flex-row items-center justify-between gap-2 border-t border-[var(--cermin-border,#d9e2ec)]/80 pt-2.5 sm:pt-3 landscape:pt-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-10 sm:min-h-11 w-auto bg-white/80"
              onClick={() =>
                replaceQuery({
                  step: "category",
                  studentId: null,
                  categoryId: null,
                  storyId: null,
                })
              }
            >
              Kembali
            </Button>
            {storyTotalPages > 1 ? (
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 sm:min-h-11 min-w-10 sm:min-w-11 bg-white/80 px-2.5 sm:px-3"
                  disabled={safeStoryPage <= 0}
                  aria-label="Cerita sebelumnya"
                  onClick={() => setStoryPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="size-4 sm:size-5" aria-hidden />
                  <span className="sr-only sm:not-sr-only sm:ml-1 text-xs sm:text-sm">Sebelumnya</span>
                </Button>
                <Button
                  type="button"
                  className="min-h-10 sm:min-h-11 min-w-10 sm:min-w-11 px-2.5 sm:px-3"
                  disabled={safeStoryPage >= storyTotalPages - 1}
                  aria-label="Cerita berikutnya"
                  onClick={() =>
                    setStoryPage((p) => Math.min(storyTotalPages - 1, p + 1))
                  }
                >
                  <span className="sr-only sm:not-sr-only sm:mr-1 text-xs sm:text-sm">Berikutnya</span>
                  <ChevronRight className="size-4 sm:size-5" aria-hidden />
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === "preview" ? (
        <section
          className="flex min-h-0 flex-1 flex-col justify-between gap-3 sm:gap-6 landscape:gap-2"
          aria-labelledby="sesi-preview-title"
        >
          <div className="shrink-0 landscape:py-0">
            <h2
              id="sesi-preview-title"
              className="text-xl font-semibold text-[var(--text,#1f2933)] sm:text-2xl md:text-3xl landscape:sr-only"
            >
              Konfirmasi cerita
            </h2>
            <p className="mt-1 sm:mt-2 text-xs sm:text-base text-[var(--cermin-muted,#5c6b73)] landscape:hidden">
              Tekan play untuk membuka layar cerita. Nama murid dipilih nanti
              saat membaca.
            </p>
          </div>

          {selectedStory ? (
            <div className="grid min-h-0 flex-1 gap-3 sm:gap-5 rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-3 sm:p-6 shadow-[0_12px_32px_-20px_color-mix(in_srgb,var(--cermin-accent,#3d7c6b)_35%,transparent)] sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] landscape:grid-cols-2 landscape:gap-4 landscape:items-center landscape:p-3 sm:landscape:p-4 overflow-hidden">
              <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-[var(--accent-soft,#e6f2ee)]/40 h-full max-h-[min(52dvh,13rem)] w-full">
                {selectedStory.coverMediaId ? (
                  <CoverThumb
                    mediaId={selectedStory.coverMediaId}
                    alt={`Cover ${selectedStory.title}`}
                    className="max-h-full max-w-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-4 text-xs sm:text-sm text-[var(--cermin-muted,#5c6b73)]">
                    Belum ada cover
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-col justify-center gap-1.5 sm:gap-3 h-full overflow-y-auto pr-1">
                <p className="text-[11px] sm:text-xs font-semibold tracking-wide text-[var(--cermin-muted,#5c6b73)] uppercase">
                  {selectedStory.categoryName}
                </p>
                <h3 className="text-base sm:text-2xl font-bold text-[var(--text,#1f2933)] leading-snug">
                  {selectedStory.title}
                </h3>
                <p className="whitespace-pre-wrap text-xs sm:text-base text-[var(--cermin-muted,#5c6b73)] line-clamp-3 sm:line-clamp-4 leading-relaxed">
                  {selectedStory.description.trim() || "Tidak ada deskripsi."}
                </p>
                <p className="inline-flex w-fit items-center rounded-full bg-[var(--accent-soft,#e6f2ee)] px-2.5 py-0.5 text-xs font-medium text-[var(--cermin-accent,#3d7c6b)] sm:text-sm">
                  {selectedStory.pageCount} halaman
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
              Cerita tidak ditemukan. Pilih ulang dari daftar.
            </p>
          )}

          {error ? (
            <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-auto flex shrink-0 flex-row items-center justify-between gap-3 border-t border-[var(--cermin-border,#d9e2ec)]/80 pt-2.5 sm:pt-5 landscape:pt-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-10 sm:min-h-11 w-auto bg-white/80"
              disabled={pending || starting}
              onClick={() =>
                replaceQuery({
                  step: "story",
                  studentId: studentIdParam || null,
                  categoryId: categoryIdParam,
                  storyId: null,
                })
              }
            >
              Kembali
            </Button>
            <button
              type="button"
              disabled={!selectedStory || !studentId || pending || starting}
              onClick={() => void onStartStory()}
              className="inline-flex min-h-10 sm:min-h-14 w-auto items-center justify-center gap-2.5 rounded-full bg-[var(--cermin-accent,#3d7c6b)] px-6 sm:px-8 text-sm sm:text-lg font-semibold text-white shadow-[0_8px_24px_rgba(61,124,107,0.28)] transition-[transform,background-color,box-shadow] duration-200 hover:bg-[var(--focus,#0b6e4f)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-w-[14rem]"
            >
              <span className="flex size-7 sm:size-9 items-center justify-center rounded-full bg-white/20">
                {starting || pending ? (
                  <Loader2 className="size-4 sm:size-5 animate-spin motion-reduce:animate-none" aria-hidden />
                ) : (
                  <Play className="size-3.5 sm:size-5 fill-current" aria-hidden />
                )}
              </span>
              {starting || pending ? "Menyiapkan sesi…" : "Mulai Cerita"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
