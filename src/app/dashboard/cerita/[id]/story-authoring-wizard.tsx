"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  ClipboardList,
  Eye,
  FileText,
  Send,
} from "lucide-react";
import type { AuthoringStepId } from "./authoring-tab";

export type { AuthoringStepId } from "./authoring-tab";
export { parseAuthoringTab } from "./authoring-tab";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export type AuthoringStepMeta = {
  id: AuthoringStepId;
  title: string;
  short: string;
  tip: string;
  done: boolean;
};

const STEP_ICONS: Record<AuthoringStepId, typeof FileText> = {
  identitas: FileText,
  halaman: BookOpen,
  preview: Eye,
  evaluasi: ClipboardList,
  status: Send,
};

type Props = {
  storyId: string;
  steps: AuthoringStepMeta[];
  statusLabel: string;
  editable: boolean;
  active: AuthoringStepId;
  children: ReactNode;
};

function tabHref(storyId: string, tab: AuthoringStepId) {
  return `/dashboard/cerita/${storyId}?tab=${tab}`;
}

export function StoryAuthoringWizard({
  storyId,
  steps,
  statusLabel,
  editable,
  active,
  children,
}: Props) {
  const activeMeta = steps.find((s) => s.id === active) ?? steps[0];
  const activeIndex = steps.findIndex((s) => s.id === active);
  const prev = activeIndex > 0 ? steps[activeIndex - 1] : null;
  const next =
    activeIndex >= 0 && activeIndex < steps.length - 1
      ? steps[activeIndex + 1]
      : null;
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="flex flex-col gap-6">
      <div
        className="rounded-xl border border-[var(--border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4 sm:p-5"
        role="region"
        aria-label="Progres penyusunan cerita"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
              Susun cerita dalam {steps.length} langkah
            </h2>
            <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
              {editable
                ? "Hanya langkah aktif yang dimuat — pindah langkah lebih ringan. Setiap bagian punya tombol simpan sendiri."
                : "Mode baca saja. Status cerita saat ini tidak mengizinkan mengubah konten."}
            </p>
          </div>
          <p className="shrink-0 text-sm font-medium text-[var(--text,#1f2933)]">
            <span className="text-[var(--cermin-accent,#3d7c6b)]">
              {doneCount}
            </span>
            {" / "}
            {steps.length} selesai · Status: {statusLabel}
          </p>
        </div>

        <ol
          className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
          aria-label="Daftar langkah"
        >
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[step.id];
            const isActive = step.id === active;
            return (
              <li key={step.id}>
                <Link
                  href={tabHref(storyId, step.id)}
                  prefetch
                  scroll={false}
                  aria-current={isActive ? "page" : undefined}
                  className={cx(
                    "flex w-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-left",
                    "min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2",
                    isActive
                      ? "border-[var(--cermin-accent,#3d7c6b)] bg-[var(--accent-soft,#e6f2ee)]"
                      : "cermin-hover-card border-[var(--border,#d9e2ec)] bg-[var(--bg,#f7f4ef)]",
                  )}
                >
                  <span
                    className={cx(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      step.done
                        ? "bg-[var(--cermin-accent,#3d7c6b)] text-white"
                        : isActive
                          ? "bg-white text-[var(--cermin-accent,#3d7c6b)] ring-1 ring-[var(--cermin-accent,#3d7c6b)]"
                          : "bg-white text-[var(--cermin-muted,#5c6b73)] ring-1 ring-[var(--border,#d9e2ec)]",
                    )}
                    aria-hidden
                  >
                    {step.done ? (
                      <Check className="size-4" strokeWidth={2.5} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text,#1f2933)]">
                      <Icon
                        className="size-3.5 shrink-0 opacity-70"
                        aria-hidden
                      />
                      {step.short}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--cermin-muted,#5c6b73)]">
                      {step.done
                        ? "Selesai"
                        : isActive
                          ? "Sedang dikerjakan"
                          : "Belum"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--border,#d9e2ec)]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={doneCount}
          aria-label="Progres langkah cerita"
        >
          <div
            className="h-full rounded-full bg-[var(--cermin-accent,#3d7c6b)] transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{
              width: `${steps.length ? (doneCount / steps.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {activeMeta ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-[var(--border,#d9e2ec)] bg-[var(--accent-soft,#e6f2ee)] px-4 py-3 sm:px-5">
            <p className="text-sm font-semibold text-[var(--text,#1f2933)]">
              Langkah {activeIndex + 1}: {activeMeta.title}
            </p>
            <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
              {activeMeta.tip}
            </p>
          </div>

          <div role="tabpanel" aria-label={activeMeta.title}>
            {children}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            {prev ? (
              <Link
                href={tabHref(storyId, prev.id)}
                prefetch
                scroll={false}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-[var(--border,#d9e2ec)] bg-white px-4 text-sm font-medium text-[var(--text,#1f2933)] transition-colors hover:bg-[var(--accent-soft,#e6f2ee)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
              >
                ← {prev.short}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={tabHref(storyId, next.id)}
                prefetch
                scroll={false}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-[var(--cermin-accent,#3d7c6b)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--focus,#0b6e4f)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2"
              >
                Lanjut: {next.short} →
              </Link>
            ) : (
              <p className="text-sm text-[var(--cermin-muted,#5c6b73)] sm:text-right">
                Langkah terakhir — pastikan status siap sebelum memandu sesi.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
