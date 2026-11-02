"use client";

import { useState, useTransition } from "react";
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

/** Grid responsif — di mobile 1–2 kolom, di landscape 2–3 kolom supaya pilihan tidak terpotong. */
function answersGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2 landscape:grid-cols-2";
  if (count === 3) return "grid-cols-1 sm:grid-cols-3 landscape:grid-cols-3";
  if (count === 4) return "grid-cols-1 sm:grid-cols-2 landscape:grid-cols-2";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 landscape:grid-cols-2";
}

function answerImageMax(count: number): string {
  if (count <= 2) return "max-h-[min(20dvh,8rem)] landscape:max-h-[min(16dvh,5rem)]";
  if (count <= 4) return "max-h-[min(16dvh,6.5rem)] landscape:max-h-[min(12dvh,4rem)]";
  return "max-h-[min(12dvh,5rem)] landscape:max-h-[min(10dvh,3.5rem)]";
}
type Feedback = "correct" | "incorrect";

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  if ("AudioContext" in window) return window.AudioContext;
  const win = window as WindowWithWebkitAudio;
  return win.webkitAudioContext ?? null;
}

function playFeedbackAudio(type: Feedback) {
  try {
    const AudioCtx = getAudioContextClass();
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    if (type === "correct") {
      // Nada ceria akor mayor lembut: C5 (523.25 Hz), E5 (659.25 Hz), G5 (783.99 Hz)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0, now + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.09 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.36);
      });
    } else {
      // Nada hangat menenangkan dua ketukan lembut: F4 (349.23 Hz), A4 (440 Hz)
      const freqs = [349.23, 440];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.1 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.33);
      });
    }
  } catch {
    // Abaikan jika audio context belum diizinkan browser
  }
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
      const nextFeedback = result.data.isCorrect ? "correct" : "incorrect";
      setFeedback(nextFeedback);
      playFeedbackAudio(nextFeedback);
    });
  }

  const isCorrect = feedback === "correct";
  return (
    <>
      <section
        className="belajar-page-card flex w-full flex-col gap-2.5 p-3 sm:gap-3.5 sm:p-5 max-h-full overflow-y-auto"
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
            className="mx-auto max-h-[min(14dvh,5.5rem)] landscape:max-h-[min(12dvh,4rem)] w-auto object-contain"
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
          className="max-w-sm gap-0 border-2 border-[var(--belajar-line,#c5d4cc)] bg-[var(--belajar-page,#fff)] p-0 shadow-lg sm:rounded-3xl overflow-hidden"
        >
          <div className="flex flex-col items-center px-6 pt-7 pb-4 text-center">
            {/* Maskot Animasi Ceria & Ramah */}
            <div className="relative mb-3 flex size-28 items-center justify-center">
              {isCorrect ? (
                <>
                  <div
                    className="absolute size-24 rounded-full bg-[var(--belajar-accent-soft,#e6f2ee)] cermin-anim-halo"
                    aria-hidden
                  />
                  {/* Partikel bintang ceria */}
                  <span
                    className="absolute -top-1 -right-2 text-xl select-none cermin-anim-sparkle-1"
                    aria-hidden
                  >
                    ✨
                  </span>
                  <span
                    className="absolute -top-2 -left-2 text-lg select-none cermin-anim-sparkle-2"
                    aria-hidden
                  >
                    ⭐
                  </span>
                  <span
                    className="absolute -bottom-1 -right-2 text-lg select-none cermin-anim-sparkle-3"
                    aria-hidden
                  >
                    🌟
                  </span>
                  <span
                    className="absolute bottom-1 -left-3 text-xl select-none cermin-anim-sparkle-4"
                    aria-hidden
                  >
                    ✨
                  </span>

                  {/* Bintang Bahagia Berwajah Lucu (SVG) */}
                  <div className="relative z-10 cermin-anim-pop cermin-anim-float" aria-hidden>
                    <svg
                      viewBox="0 0 100 100"
                      className="size-20 drop-shadow-md"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Bintang warna emas hangat */}
                      <path
                        d="M50 5L61.2 32.5L90.8 35.1L68.5 54.4L75.1 83.4L50 68.3L24.9 83.4L31.5 54.4L9.2 35.1L38.8 32.5L50 5Z"
                        fill="#F59E0B"
                        stroke="#D97706"
                        strokeWidth="3"
                        strokeLinejoin="round"
                      />
                      {/* Pipi merah lembut */}
                      <circle cx="34" cy="52" r="5" fill="#FCA5A5" opacity="0.8" />
                      <circle cx="66" cy="52" r="5" fill="#FCA5A5" opacity="0.8" />
                      {/* Mata gembira melengkung */}
                      <path
                        d="M34 45C34 42 40 42 40 45"
                        stroke="#78350F"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M60 45C60 42 66 42 66 45"
                        stroke="#78350F"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      {/* Senyum lebar bahagia */}
                      <path
                        d="M42 53C44 58 56 58 58 53"
                        stroke="#78350F"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="absolute size-24 rounded-full bg-[#fef3c7] cermin-anim-halo"
                    aria-hidden
                  />
                  {/* Partikel gelembung & tunas menenangkan */}
                  <span
                    className="absolute -top-1 -right-2 text-xl select-none cermin-anim-sparkle-1"
                    aria-hidden
                  >
                    🫧
                  </span>
                  <span
                    className="absolute -top-2 -left-2 text-lg select-none cermin-anim-sparkle-2"
                    aria-hidden
                  >
                    🌱
                  </span>
                  <span
                    className="absolute -bottom-1 -right-2 text-lg select-none cermin-anim-sparkle-3"
                    aria-hidden
                  >
                    💫
                  </span>
                  <span
                    className="absolute bottom-1 -left-3 text-xl select-none cermin-anim-sparkle-4"
                    aria-hidden
                  >
                    🫧
                  </span>

                  {/* Karakter Tunas Ceria Menggemaskan (SVG) */}
                  <div className="relative z-10 cermin-anim-pop cermin-anim-wobble" aria-hidden>
                    <svg
                      viewBox="0 0 100 100"
                      className="size-20 drop-shadow-md"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Badan bulat lembut */}
                      <circle
                        cx="50"
                        cy="58"
                        r="32"
                        fill="#ECFDF5"
                        stroke="#34D399"
                        strokeWidth="3.5"
                      />
                      {/* Daun kecil ramah di atas kepala */}
                      <path
                        d="M50 26C45 15 32 18 36 28C40 38 48 30 50 26Z"
                        fill="#10B981"
                      />
                      <path
                        d="M50 26C55 15 68 18 64 28C60 38 52 30 50 26Z"
                        fill="#059669"
                      />
                      {/* Pipi merona ramah */}
                      <circle cx="36" cy="62" r="5" fill="#FCA5A5" opacity="0.8" />
                      <circle cx="64" cy="62" r="5" fill="#FCA5A5" opacity="0.8" />
                      {/* Mata berkedip ramah */}
                      <circle cx="40" cy="54" r="3.5" fill="#065F46" />
                      <circle cx="60" cy="54" r="3.5" fill="#065F46" />
                      {/* Senyum ramah hangat */}
                      <path
                        d="M44 64C46 68 54 68 56 64"
                        stroke="#065F46"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </>
              )}
            </div>

            <DialogHeader className="items-center gap-1.5 p-0 text-center">
              <DialogTitle className="text-2xl font-bold text-[var(--belajar-ink,#1f2933)]">
                {isCorrect ? "Wah, Hebat Sekali! ⭐" : "Hampir Tepat! 🌱"}
              </DialogTitle>
              <DialogDescription className="text-base font-medium text-[var(--belajar-quiet,#5c6b73)] px-2">
                {isCorrect
                  ? "Jawabanmu tepat sekali! Kamu pintar dan hebat."
                  : "Tidak apa-apa, kamu hebat sudah mencoba! Yuk kita coba lagi bersama ya."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <DialogFooter className="border-0 bg-[var(--belajar-ground,#f7f4ef)]/60 px-6 py-4 sm:justify-center">
            <Button
              type="button"
              className={`min-h-12 w-full text-base font-bold shadow-sm sm:w-auto sm:min-w-[11rem] cursor-pointer ${
                isCorrect
                  ? "bg-[var(--belajar-accent,#3d7c6b)] text-white hover:bg-[var(--belajar-focus,#0b6e4f)]"
                  : "bg-[var(--belajar-accent,#3d7c6b)] text-white hover:bg-[var(--belajar-focus,#0b6e4f)]"
              }`}
              onClick={() => setFeedback(null)}
            >
              {isCorrect ? "Lanjut Cerita 🌟" : "Coba Lagi Yuk! 😊"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
