"use client";

import { useState, useTransition } from "react";
import { upsertSessionMcqResponse } from "@/server/actions/evaluations";
import type { SessionPageMcq } from "@/server/actions/sessions";
import type { McqKey } from "@/server/validations/evaluation";

/** Grid agar semua opsi muat satu layar (tanpa scroll jawaban). */
function answersGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-3";
  if (count === 4) return "grid-cols-2 sm:grid-cols-4";
  if (count === 5) return "grid-cols-3 sm:grid-cols-5";
  return "grid-cols-3 sm:grid-cols-6";
}

function answerImageMax(count: number): string {
  if (count <= 2) return "max-h-[min(22dvh,9rem)]";
  if (count <= 4) return "max-h-[min(16dvh,6.5rem)]";
  return "max-h-[min(12dvh,5rem)]";
}

export function PageMcqBlock({
  sessionId,
  studentId,
  mcq,
  disabled,
}: {
  sessionId: string;
  studentId: string;
  mcq: SessionPageMcq;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(mcq.selectedKey);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const n = mcq.choices.length;
  const imgMax = answerImageMax(n);

  function onSelect(key: string) {
    if (disabled || pending) return;
    setError(null);
    setSelected(key);
    startTransition(async () => {
      const result = await upsertSessionMcqResponse({
        sessionId,
        studentId,
        pageMcqId: mcq.id,
        selectedKey: key as McqKey,
      });
      if (!result.ok) {
        setError(result.error);
        setSelected(mcq.selectedKey);
      }
    });
  }

  return (
    <section
      className="belajar-page-card flex max-h-[min(72dvh,36rem)] flex-col gap-2 overflow-hidden p-2.5 sm:gap-3 sm:p-3"
      aria-label="Soal pilihan"
    >
      <p className="shrink-0 text-base font-semibold leading-snug text-[var(--belajar-ink,#1f2933)] sm:text-lg">
        {mcq.prompt}
      </p>
      {mcq.promptImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mcq.promptImageUrl}
          alt=""
          className="mx-auto max-h-[min(14dvh,5.5rem)] w-auto shrink-0 object-contain"
        />
      ) : null}
      <ul
        className={`grid min-h-0 flex-1 gap-1.5 sm:gap-2 ${answersGridClass(n)}`}
      >
        {mcq.choices.map((choice) => {
          const isSelected = selected === choice.key;
          return (
            <li key={choice.key} className="min-h-0 min-w-0">
              <button
                type="button"
                disabled={disabled || pending}
                onClick={() => onSelect(choice.key)}
                aria-pressed={isSelected}
                className={`flex h-full min-h-11 w-full flex-col items-stretch justify-center gap-1 rounded-xl border-2 px-2 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)] disabled:opacity-50 sm:px-2.5 ${
                  isSelected
                    ? "border-[var(--belajar-accent,#3d7c6b)] bg-[var(--belajar-accent-soft,#e6f2ee)]"
                    : "border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-page,#fff)] hover:border-[var(--belajar-accent,#3d7c6b)]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--belajar-accent-soft,#e6f2ee)] text-sm font-semibold text-[var(--belajar-accent,#3d7c6b)] sm:size-9 sm:text-base">
                    {choice.key}
                  </span>
                  {choice.labelText.trim() ? (
                    <span className="line-clamp-2 text-sm font-medium leading-snug text-[var(--belajar-ink,#1f2933)] sm:text-base">
                      {choice.labelText}
                    </span>
                  ) : null}
                </span>
                {choice.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={choice.imageUrl}
                    alt=""
                    className={`w-full object-contain ${imgMax}`}
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="shrink-0 text-sm text-[var(--danger,#9b2c2c)]" role="alert">
          {error}
        </p>
      ) : null}
      {pending ? (
        <span className="sr-only" role="status">
          Menyimpan jawaban…
        </span>
      ) : null}
    </section>
  );
}
