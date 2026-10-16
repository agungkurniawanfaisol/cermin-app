"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Check,
  Circle,
  FilePenLine,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import { transitionStoryStatus } from "@/server/actions/stories";
import { Button } from "@/components/ui/button";
import type { StoryStatusValue } from "@/server/validations/story";

const PIPELINE: StoryStatusValue[] = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "PUBLISHED",
];

const STATUS_LABEL: Record<StoryStatusValue, string> = {
  DRAFT: "Draf",
  REVIEW: "Review",
  APPROVED: "Disetujui",
  PUBLISHED: "Terbit",
  ARCHIVED: "Arsip",
};

const STATUS_DESC: Record<StoryStatusValue, string> = {
  DRAFT: "Konten masih disusun. Terapis pembuat dan admin bisa mengedit.",
  REVIEW: "Menunggu tinjauan admin. Bisa disetujui atau dikembalikan ke draf.",
  APPROVED: "Siap diterbitkan oleh admin ke child mode.",
  PUBLISHED: "Bisa dipilih untuk sesi belajar. Bisa dikembalikan ke draf atau diarsipkan.",
  ARCHIVED: "Tidak dipakai lagi. Tidak bisa diedit.",
};

const FORWARD_ACTION: Partial<
  Record<StoryStatusValue, { to: StoryStatusValue; label: string }>
> = {
  DRAFT: { to: "REVIEW", label: "Ajukan review" },
  REVIEW: { to: "APPROVED", label: "Setujui" },
  APPROVED: { to: "PUBLISHED", label: "Publikasikan" },
};

const ICONS: Record<StoryStatusValue, typeof FilePenLine> = {
  DRAFT: FilePenLine,
  REVIEW: Search,
  APPROVED: ShieldCheck,
  PUBLISHED: Send,
  ARCHIVED: Archive,
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function pipelineIndex(status: StoryStatusValue): number {
  if (status === "ARCHIVED") return PIPELINE.length;
  return PIPELINE.indexOf(status);
}

export function StatusTimeline({
  storyId,
  currentStatus,
  targets,
}: {
  storyId: string;
  currentStatus: StoryStatusValue;
  targets: StoryStatusValue[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const targetSet = new Set(targets);
  const currentIdx = pipelineIndex(currentStatus);

  function onTransition(toStatus: StoryStatusValue) {
    setError(null);
    if (toStatus === "ARCHIVED") {
      if (!window.confirm("Arsipkan cerita ini? Konten tidak bisa diedit lagi.")) {
        return;
      }
    }
    if (toStatus === "PUBLISHED") {
      if (
        !window.confirm(
          "Publikasikan cerita ini? Cerita akan tersedia untuk sesi child mode.",
        )
      ) {
        return;
      }
    }
    if (toStatus === "DRAFT" && currentStatus !== "DRAFT") {
      if (
        !window.confirm(
          "Kembalikan ke draf? Alur penerbitan dimulai ulang dari awal.",
        )
      ) {
        return;
      }
    }
    startTransition(async () => {
      const result = await transitionStoryStatus({ storyId, toStatus });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const forward = FORWARD_ACTION[currentStatus];
  const canForward = forward ? targetSet.has(forward.to) : false;
  const canReturnDraft =
    currentStatus !== "DRAFT" && targetSet.has("DRAFT");
  const canArchive = targetSet.has("ARCHIVED");

  return (
    <div className="space-y-5 rounded-xl border border-[var(--border,#d9e2ec)] bg-white p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
          Alur status
        </h2>
        <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
          Status saat ini:{" "}
          <span className="font-medium text-[var(--text,#1f2933)]">
            {STATUS_LABEL[currentStatus]}
          </span>
          . Klik aksi di tahap berikutnya untuk menyetujui atau mengubah sendiri
          sesuai wewenang Anda.
        </p>
      </div>

      <ol className="relative space-y-0" aria-label="Timeline status cerita">
        {PIPELINE.map((status, index) => {
          const Icon = ICONS[status];
          const isCurrent = currentStatus === status;
          const isPast =
            currentStatus !== "ARCHIVED" && index < currentIdx;
          const isFuture = index > currentIdx || currentStatus === "ARCHIVED";
          const isNext =
            forward?.to === status && canForward && !isPast && !isCurrent;
          const showForwardHere = isNext;

          return (
            <li key={status} className="relative flex gap-3 pb-6 last:pb-0">
              {index < PIPELINE.length - 1 ? (
                <span
                  className={cx(
                    "absolute top-8 bottom-0 left-[15px] w-0.5",
                    isPast || isCurrent
                      ? "bg-[var(--cermin-accent,#3d7c6b)]"
                      : "bg-[var(--border,#d9e2ec)]",
                  )}
                  aria-hidden
                />
              ) : null}

              <span
                className={cx(
                  "relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full",
                  isCurrent
                    ? "bg-[var(--cermin-accent,#3d7c6b)] text-white ring-4 ring-[var(--accent-soft,#e6f2ee)]"
                    : isPast
                      ? "bg-[var(--cermin-accent,#3d7c6b)] text-white"
                      : "bg-[var(--bg,#f7f4ef)] text-[var(--cermin-muted,#5c6b73)] ring-1 ring-[var(--border,#d9e2ec)]",
                )}
                aria-hidden
              >
                {isPast ? (
                  <Check className="size-4" strokeWidth={2.5} />
                ) : isCurrent ? (
                  <Icon className="size-4" />
                ) : (
                  <Circle className="size-3.5" strokeWidth={2} />
                )}
              </span>

              <div
                className={cx(
                  "min-w-0 flex-1 rounded-xl border px-3 py-3 sm:px-4",
                  isCurrent
                    ? "border-[var(--cermin-accent,#3d7c6b)] bg-[var(--accent-soft,#e6f2ee)]"
                    : "border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]",
                  isFuture && !isNext ? "opacity-70" : null,
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text,#1f2933)]">
                      {index + 1}. {STATUS_LABEL[status]}
                      {isCurrent ? (
                        <span className="ml-2 text-xs font-medium text-[var(--cermin-accent,#3d7c6b)]">
                          Saat ini
                        </span>
                      ) : null}
                      {isPast ? (
                        <span className="ml-2 text-xs font-medium text-[var(--cermin-muted,#5c6b73)]">
                          Selesai
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
                      {STATUS_DESC[status]}
                    </p>
                  </div>
                </div>

                {showForwardHere ? (
                  <div className="mt-3">
                    <Button
                      type="button"
                      className="min-h-11 w-full sm:w-auto"
                      disabled={pending}
                      onClick={() => onTransition(forward!.to)}
                    >
                      {pending ? "Memproses…" : forward!.label}
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {currentStatus === "ARCHIVED" ? (
        <div className="rounded-xl border border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] px-4 py-3">
          <p className="text-sm font-semibold text-[var(--text,#1f2933)]">
            Cerita diarsipkan
          </p>
          <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
            {STATUS_DESC.ARCHIVED}
          </p>
        </div>
      ) : null}

      {(canReturnDraft || canArchive) && currentStatus !== "ARCHIVED" ? (
        <div className="space-y-3 border-t border-[var(--border,#d9e2ec)] pt-4">
          <p className="text-sm font-medium text-[var(--text,#1f2933)]">
            Ubah sendiri
          </p>
          <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
            Kembalikan ke draf untuk mengedit ulang, atau arsipkan jika cerita
            tidak dipakai.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {canReturnDraft ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                disabled={pending}
                onClick={() => onTransition("DRAFT")}
              >
                Kembalikan ke draf
              </Button>
            ) : null}
            {canArchive ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full border-[var(--danger,#9b2c2c)]/30 text-[var(--danger,#9b2c2c)] sm:w-auto"
                disabled={pending}
                onClick={() => onTransition("ARCHIVED")}
              >
                Arsipkan
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {targets.length === 0 && currentStatus !== "ARCHIVED" ? (
        <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
          Tidak ada aksi status yang tersedia untuk peran atau status saat ini.
        </p>
      ) : null}

      {!canForward &&
      targets.length > 0 &&
      !canReturnDraft &&
      !canArchive ? (
        <div className="flex flex-col gap-2 border-t border-[var(--border,#d9e2ec)] pt-4 sm:flex-row sm:flex-wrap">
          {targets.map((to) => (
            <Button
              key={to}
              type="button"
              className="min-h-11 w-full sm:w-auto"
              variant={to === "ARCHIVED" ? "outline" : "default"}
              disabled={pending}
              onClick={() => onTransition(to)}
            >
              {to === "REVIEW"
                ? "Ajukan review"
                : to === "APPROVED"
                  ? "Setujui"
                  : to === "PUBLISHED"
                    ? "Publikasikan"
                    : to === "DRAFT"
                      ? "Kembalikan ke draf"
                      : to === "ARCHIVED"
                        ? "Arsipkan"
                        : to}
            </Button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
