"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, ChevronLeft, ChevronRight, Play } from "lucide-react";
import {
  startLearningSession,
  type PublishedStoryOption,
} from "@/server/actions/sessions";
import { Button } from "@/components/ui/button";

/** Kolom grid cerita: max 2 baris → pageSize = cols * 2. */
function useStoryGridCols(): number {
  const [cols, setCols] = useState(2);

  useEffect(() => {
    function read() {
      const w = window.innerWidth;
      if (w >= 1280) setCols(4);
      else if (w >= 768) setCols(3);
      else setCols(2);
    }
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  return cols;
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
}: {
  mediaId: string;
  alt: string;
  compact?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const box = compact
    ? "h-full w-full rounded-none border-0"
    : "aspect-[4/3] w-full rounded-xl border border-[var(--cermin-border,#d9e2ec)]";

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
      className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2"
      aria-label="Progres mulai sesi"
    >
      {items.map((item, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li key={item.id} className="flex items-center gap-1.5 sm:gap-2">
            {index > 0 ? (
              <span
                className="text-[var(--cermin-border,#d9e2ec)]"
                aria-hidden
              >
                /
              </span>
            ) : null}
            <span
              className={
                active
                  ? "inline-flex items-center gap-1.5 rounded-full bg-[var(--cermin-accent,#3d7c6b)] px-2.5 py-1 text-xs font-semibold text-white sm:text-sm"
                  : done
                    ? "inline-flex items-center gap-1.5 text-xs font-medium text-[var(--cermin-accent,#3d7c6b)] sm:text-sm"
                    : "inline-flex items-center gap-1.5 text-xs text-[var(--cermin-muted,#5c6b73)] sm:text-sm"
              }
              aria-current={active ? "step" : undefined}
            >
              <span
                className={
                  active
                    ? "flex size-5 items-center justify-center rounded-full bg-white/25 text-[0.65rem] font-bold"
                    : done
                      ? "flex size-5 items-center justify-center rounded-full bg-[var(--accent-soft,#e6f2ee)] text-[0.65rem] font-bold text-[var(--cermin-accent,#3d7c6b)]"
                      : "flex size-5 items-center justify-center rounded-full border border-[var(--cermin-border,#d9e2ec)] text-[0.65rem] font-medium"
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
  const storyCols = useStoryGridCols();

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

  /** Maks 2 baris: pageSize = kolom × 2. */
  const storyPageSize = Math.max(2, storyCols * 2);
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
    storyCols >= 4
      ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
      : storyCols >= 3
        ? "grid-cols-2 md:grid-cols-3"
        : "grid-cols-2";

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

  function onStartStory() {
    if (!studentId || !storyIdParam || starting || pending) return;
    setError(null);
    setStarting(true);
    startTransition(async () => {
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
    });
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
    ? step === "story"
      ? "mx-auto flex h-dvh max-h-dvh w-full max-w-[90rem] flex-col gap-3 overflow-hidden px-4 py-4 sm:gap-4 sm:px-8 sm:py-5 md:px-10 lg:px-16"
      : "mx-auto flex min-h-dvh w-full max-w-[90rem] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-8 sm:py-10 md:px-10 lg:px-16"
    : "flex w-full flex-col gap-5 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-4 shadow-sm sm:p-5";

  return (
    <div className={shellClass}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--cermin-border,#d9e2ec)]/80 pb-3 sm:pb-4">
        <p className="shrink-0 text-sm font-medium tracking-wide text-[var(--cermin-accent,#3d7c6b)] uppercase">
          CERMIN
        </p>
        <div className="min-w-0">
          <Progress step={step} />
        </div>
      </header>

      {step === "category" ? (
        <section
          className="flex flex-1 flex-col gap-6"
          aria-label="Pilih kategori cerita"
        >
          {categories.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-white/80 px-4 py-8 text-center text-sm text-[var(--cermin-muted,#5c6b73)]">
              Tidak ada kategori dengan cerita terbit.
            </p>
          ) : (
            <ul className="grid w-full grid-cols-2 gap-4 sm:gap-7 lg:gap-10">
              {categories.map((cat) => (
                <li key={cat.id} className="min-w-0">
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
                    className="group flex min-h-[14rem] w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white text-left shadow-[0_10px_28px_-18px_color-mix(in_srgb,var(--cermin-accent,#3d7c6b)_35%,transparent)] transition-[border-color,box-shadow,transform] duration-200 hover:border-[var(--cermin-accent,#3d7c6b)] hover:shadow-[0_14px_32px_-16px_color-mix(in_srgb,var(--cermin-accent,#3d7c6b)_40%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-h-[17rem] md:min-h-[19rem]"
                  >
                    <div className="relative h-28 w-full shrink-0 overflow-hidden border-b border-[var(--cermin-border,#d9e2ec)]/70 bg-[var(--accent-soft,#e6f2ee)]/60 sm:h-36 md:h-44">
                      <CategoryCoverThumb categoryId={cat.id} coverUrl={cat.coverUrl} />
                    </div>
                    <div className="flex flex-1 flex-col gap-2 px-4 py-4 sm:gap-3 sm:px-7 sm:py-5">
                      <div className="flex items-start gap-2">
                        <span className="min-w-0 flex-1 text-xl font-semibold leading-snug text-[var(--text,#1f2933)] sm:text-2xl md:text-3xl">
                          {cat.name}
                        </span>
                        <ChevronRight
                          className="mt-1 size-5 shrink-0 text-[var(--cermin-muted,#5c6b73)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--cermin-accent,#3d7c6b)] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 sm:size-6"
                          aria-hidden
                        />
                      </div>
                      {cat.description?.trim() ? (
                        <span className="text-sm leading-relaxed text-[var(--cermin-muted,#5c6b73)] line-clamp-3 sm:text-lg">
                          {excerpt(cat.description, 180)}
                        </span>
                      ) : null}
                      <span className="mt-auto inline-flex w-fit items-center rounded-full bg-[var(--accent-soft,#e6f2ee)] px-3.5 py-1.5 text-sm font-medium text-[var(--cermin-accent,#3d7c6b)] sm:px-4 sm:text-base">
                        {cat.storyCount} cerita
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-auto flex flex-col gap-2 border-t border-[var(--cermin-border,#d9e2ec)]/80 pt-5 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full bg-white/80 sm:w-auto"
              onClick={onCancel}
            >
              Batal
            </Button>
          </div>
        </section>
      ) : null}

      {step === "story" ? (
        <section
          className="flex min-h-0 flex-1 flex-col gap-3"
          aria-label={
            selectedCategory
              ? `Pilih cerita: ${selectedCategory.name}`
              : "Pilih cerita"
          }
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
            {selectedCategory ? (
              <p className="inline-flex w-fit items-center rounded-full bg-[var(--accent-soft,#e6f2ee)] px-3 py-1 text-sm font-medium text-[var(--cermin-accent,#3d7c6b)]">
                {selectedCategory.name}
              </p>
            ) : (
              <span />
            )}
            {storyTotalPages > 1 ? (
              <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
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
              className={`grid min-h-0 flex-1 gap-3 sm:gap-4 ${
                filteredStories.length === 1
                  ? "mx-auto w-full max-w-md grid-cols-1 grid-rows-1"
                  : `${storyGridColsClass} ${
                      pagedStories.length > storyCols
                        ? "grid-rows-2"
                        : "grid-rows-1"
                    }`
              }`}
            >
              {pagedStories.map((story) => (
                <li key={story.id} className="min-h-0 min-w-0">
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
                    className="group flex h-full max-h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white text-left shadow-[0_8px_22px_-16px_color-mix(in_srgb,var(--cermin-accent,#3d7c6b)_35%,transparent)] transition-[border-color,box-shadow,transform] duration-200 hover:border-[var(--cermin-accent,#3d7c6b)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
                  >
                    <div className="relative h-20 w-full shrink-0 overflow-hidden border-b border-[var(--cermin-border,#d9e2ec)]/70 bg-[var(--accent-soft,#e6f2ee)]/50 sm:h-24">
                      {story.coverMediaId ? (
                        <CoverThumb
                          mediaId={story.coverMediaId}
                          alt={`Cover ${story.title}`}
                          compact
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="flex size-10 items-center justify-center rounded-xl bg-white text-[var(--cermin-accent,#3d7c6b)] shadow-sm">
                            <BookOpen className="size-5" aria-hidden />
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3">
                      <span className="line-clamp-2 text-base font-semibold leading-snug text-[var(--text,#1f2933)] sm:text-lg">
                        {story.title}
                      </span>
                      <span className="inline-flex w-fit items-center rounded-full bg-[var(--accent-soft,#e6f2ee)] px-2.5 py-0.5 text-xs font-medium text-[var(--cermin-accent,#3d7c6b)] sm:text-sm">
                        {story.pageCount} halaman
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--cermin-border,#d9e2ec)]/80 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full bg-white/80 sm:w-auto"
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
                  className="min-h-11 min-w-11 bg-white/80 px-3"
                  disabled={safeStoryPage <= 0}
                  aria-label="Cerita sebelumnya"
                  onClick={() => setStoryPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="size-5" aria-hidden />
                  <span className="sr-only sm:not-sr-only sm:ml-1">Sebelumnya</span>
                </Button>
                <Button
                  type="button"
                  className="min-h-11 min-w-11 px-3"
                  disabled={safeStoryPage >= storyTotalPages - 1}
                  aria-label="Cerita berikutnya"
                  onClick={() =>
                    setStoryPage((p) => Math.min(storyTotalPages - 1, p + 1))
                  }
                >
                  <span className="sr-only sm:not-sr-only sm:mr-1">Berikutnya</span>
                  <ChevronRight className="size-5" aria-hidden />
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === "preview" ? (
        <section
          className="flex flex-1 flex-col gap-6"
          aria-labelledby="sesi-preview-title"
        >
          <div>
            <h2
              id="sesi-preview-title"
              className="text-xl font-semibold text-[var(--text,#1f2933)] sm:text-2xl md:text-3xl"
            >
              Konfirmasi cerita
            </h2>
            <p className="mt-2 text-sm text-[var(--cermin-muted,#5c6b73)] sm:text-base">
              Tekan play untuk membuka layar cerita. Nama murid dipilih nanti
              saat membaca.
            </p>
          </div>

          {selectedStory ? (
            <div className="grid gap-5 rounded-2xl border border-[var(--cermin-border,#d9e2ec)] bg-white p-4 shadow-[0_12px_32px_-20px_color-mix(in_srgb,var(--cermin-accent,#3d7c6b)_35%,transparent)] sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] sm:p-6">
              {selectedStory.coverMediaId ? (
                <CoverThumb
                  mediaId={selectedStory.coverMediaId}
                  alt={`Cover ${selectedStory.title}`}
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-[var(--accent-soft,#e6f2ee)]/50 text-sm text-[var(--cermin-muted,#5c6b73)]">
                  Belum ada cover
                </div>
              )}
              <div className="flex min-w-0 flex-col gap-3">
                <p className="text-xs font-medium tracking-wide text-[var(--cermin-muted,#5c6b73)] uppercase">
                  {selectedStory.categoryName}
                </p>
                <h3 className="text-xl font-semibold text-[var(--text,#1f2933)] sm:text-2xl">
                  {selectedStory.title}
                </h3>
                <p className="whitespace-pre-wrap text-base text-[var(--cermin-muted,#5c6b73)]">
                  {selectedStory.description.trim() || "Tidak ada deskripsi."}
                </p>
                <p className="text-base text-[var(--text,#1f2933)]">
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

          <div className="mt-auto flex flex-col gap-3 border-t border-[var(--cermin-border,#d9e2ec)]/80 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full bg-white/80 sm:w-auto"
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
              onClick={onStartStory}
              className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[var(--cermin-accent,#3d7c6b)] px-8 text-lg font-semibold text-white shadow-[0_8px_24px_rgba(61,124,107,0.28)] transition-[transform,background-color,box-shadow] duration-200 hover:bg-[var(--focus,#0b6e4f)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-h-14 sm:w-auto sm:min-w-[14rem]"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-white/20">
                <Play className="size-5 fill-current" aria-hidden />
              </span>
              {pending || starting ? "Memulai…" : "Mulai Cerita"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
