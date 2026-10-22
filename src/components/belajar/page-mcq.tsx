"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { upsertSessionMcqResponse } from "@/server/actions/evaluations";
import type { SessionPageMcq } from "@/server/actions/sessions";
import type { McqKey } from "@/server/validations/evaluation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Grid responsif — di mobile 1–2 kolom supaya pilihan tidak terpotong. */
function answersGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  if (count === 3) return "grid-cols-1 sm:grid-cols-3";
  if (count === 4) return "grid-cols-1 sm:grid-cols-2";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}

function answerImageMax(count: number): string {
  if (count <= 2) return "max-h-[min(22dvh,9rem)]";
  if (count <= 4) return "max-h-[min(16dvh,6.5rem)]";
  return "max-h-[min(12dvh,5rem)]";
}

type Feedback = "correct" | "incorrect";

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
  const [feedback, setFeedback] = useState<Feedback | null>(null);
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
        return;
      }
      setFeedback(result.data.isCorrect ? "correct" : "incorrect");
    });
  }

  const isCorrect = feedback === "correct";

  return (
    <>
      <section
        className="belajar-page-card flex w-full flex-col gap-3 p-3 sm:gap-3.5 sm:p-4"
        aria-label="Soal pilihan"
      >
        <p className="text-base font-semibold leading-snug text-[var(--belajar-ink,#1f2933)] sm:text-lg">
          {mcq.prompt}
        </p>
        {mcq.promptImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mcq.promptImageUrl}
            alt=""
            className="mx-auto max-h-[min(14dvh,5.5rem)] w-auto object-contain"
          />
        ) : null}
        <ul className={`grid gap-2 sm:gap-2.5 ${answersGridClass(n)}`}>
          {mcq.choices.map((choice) => {
            const isSelected = selected === choice.key;
            return (
              <li key={choice.key} className="min-w-0">
                <button
                  type="button"
                  disabled={disabled || pending}
                  onClick={() => onSelect(choice.key)}
                  aria-pressed={isSelected}
                  className={`flex min-h-11 w-full flex-col items-stretch justify-center gap-1 rounded-xl border-2 px-2.5 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)] disabled:opacity-50 ${
                    isSelected
                      ? "border-[var(--belajar-accent,#3d7c6b)] bg-[var(--belajar-accent-soft,#e6f2ee)]"
                      : "border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-page,#fff)] hover:border-[var(--belajar-accent,#3d7c6b)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--belajar-accent-soft,#e6f2ee)] text-base font-semibold text-[var(--belajar-accent,#3d7c6b)]">
                      {choice.key}
                    </span>
                    {choice.labelText.trim() ? (
                      <span className="text-sm font-medium leading-snug text-[var(--belajar-ink,#1f2933)] sm:text-base">
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
          <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
            {error}
          </p>
        ) : null}
        {pending ? (
          <span className="sr-only" role="status">
            Menyimpan jawaban…
          </span>
        ) : null}
      </section>

      <Dialog
        open={feedback != null}
        onOpenChange={(open) => {
          if (!open) setFeedback(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-sm gap-0 border border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-page,#fff)] p-0 sm:rounded-2xl"
        >
          <DialogHeader className="items-center gap-3 px-5 pt-6 pb-2 text-center sm:px-6">
            <span
              className={
                isCorrect
                  ? "inline-flex size-14 items-center justify-center rounded-full bg-[var(--belajar-accent-soft,#e6f2ee)] text-[var(--belajar-accent,#3d7c6b)]"
                  : "inline-flex size-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--danger,#9b2c2c)_12%,white)] text-[var(--danger,#9b2c2c)]"
              }
              aria-hidden
            >
              {isCorrect ? (
                <Check className="size-8" strokeWidth={2.25} />
              ) : (
                <X className="size-8" strokeWidth={2.25} />
              )}
            </span>
            <DialogTitle className="text-xl font-semibold text-[var(--belajar-ink,#1f2933)]">
              {isCorrect ? "Kamu benar" : "Kamu salah"}
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--belajar-quiet,#5c6b73)]">
              {isCorrect
                ? "Jawabanmu sudah tepat. Boleh lanjut."
                : "Belum tepat. Boleh coba lagi dengan tenang."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-0 bg-transparent px-5 pb-5 sm:justify-center sm:px-6">
            <Button
              type="button"
              className="min-h-11 w-full bg-[var(--belajar-accent,#3d7c6b)] text-white hover:bg-[var(--belajar-focus,#0b6e4f)] sm:w-auto sm:min-w-[8rem]"
              onClick={() => setFeedback(null)}
            >
              Baik
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
