"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { Volume2, VolumeX, Type } from "lucide-react";
import { updateMyPreference } from "@/server/actions/preferences";
import { TEXT_SIZE_LABELS } from "@/server/validations/preference";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

const SIZES = ["SM", "MD", "LG", "XL"] as const;

/** Skala preview di dasbor (lebih kecil dari child mode agar muat di kartu). */
const PREVIEW_CLASS: Record<(typeof SIZES)[number], string> = {
  SM: "text-lg leading-relaxed sm:text-xl",
  MD: "text-xl leading-relaxed sm:text-2xl",
  LG: "text-2xl leading-relaxed sm:text-3xl",
  XL: "text-3xl leading-relaxed sm:text-4xl",
};

const SAMPLE_STORY =
  "Saya menunggu giliran. Saya bernapas pelan. Giliran saya sudah dekat.";

type PreferenceFormProps = {
  initialTextSize: (typeof SIZES)[number];
  initialAudioEnabled: boolean;
};

export function PreferenceForm({
  initialTextSize,
  initialAudioEnabled,
}: PreferenceFormProps) {
  const textGroupId = useId();
  const audioId = useId();
  const [textSize, setTextSize] = useState<(typeof SIZES)[number]>(
    initialTextSize,
  );
  const [audioEnabled, setAudioEnabled] = useState(initialAudioEnabled);
  const [savedTextSize, setSavedTextSize] =
    useState<(typeof SIZES)[number]>(initialTextSize);
  const [savedAudioEnabled, setSavedAudioEnabled] =
    useState(initialAudioEnabled);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty =
    textSize !== savedTextSize || audioEnabled !== savedAudioEnabled;

  useEffect(() => {
    if (!saved) return;
    const id = window.setTimeout(() => setSaved(false), 4000);
    return () => window.clearTimeout(id);
  }, [saved]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateMyPreference({ textSize, audioEnabled });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedTextSize(textSize);
      setSavedAudioEnabled(audioEnabled);
      setSaved(true);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section
        aria-labelledby={`${textGroupId}-heading`}
        className="rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft,#e6f2ee)] text-[var(--cermin-accent,#3d7c6b)]"
            aria-hidden
          >
            <Type className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id={`${textGroupId}-heading`}
              className="text-lg font-semibold text-[var(--text,#1f2933)]"
            >
              Ukuran teks mode belajar
            </h2>
            <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
              Dipakai saat Anda membuka sesi di child mode bersama anak. Tidak
              mengubah teks dasbor.
            </p>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-labelledby={`${textGroupId}-heading`}
          className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {SIZES.map((size) => {
            const selected = textSize === size;
            return (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setTextSize(size);
                  setSaved(false);
                  setError(null);
                }}
                className={cn(
                  "flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border px-3 py-3 text-center transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2",
                  selected
                    ? "border-[var(--cermin-accent,#3d7c6b)] bg-[var(--accent-soft,#e6f2ee)]"
                    : "border-[var(--cermin-border,#d9e2ec)] bg-white hover:bg-[var(--bg,#f7f4ef)]",
                )}
              >
                <span
                  className={cn(
                    "font-semibold text-[var(--text,#1f2933)]",
                    size === "SM" && "text-base",
                    size === "MD" && "text-lg",
                    size === "LG" && "text-xl",
                    size === "XL" && "text-2xl",
                  )}
                  aria-hidden
                >
                  Aa
                </span>
                <span className="text-xs font-medium text-[var(--cermin-muted,#5c6b73)] sm:text-sm">
                  {TEXT_SIZE_LABELS[size]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 rounded-lg border border-dashed border-[var(--cermin-border,#d9e2ec)] bg-[var(--bg,#f7f4ef)] p-4 sm:p-5">
          <p className="text-xs font-medium tracking-wide text-[var(--cermin-muted,#5c6b73)] uppercase">
            Pratinjau teks cerita
          </p>
          <p
            className={cn(
              "mt-3 font-normal text-[var(--text,#1f2933)] transition-[font-size] duration-200 motion-reduce:transition-none",
              PREVIEW_CLASS[textSize],
            )}
          >
            {SAMPLE_STORY}
          </p>
          <p className="mt-3 text-xs text-[var(--cermin-muted,#5c6b73)]">
            Di perangkat besar, teks child mode bisa sedikit lebih besar dari
            pratinjau ini.
          </p>
        </div>
      </section>

      <section
        aria-labelledby={`${audioId}-heading`}
        className="rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft,#e6f2ee)] text-[var(--cermin-accent,#3d7c6b)]"
            aria-hidden
          >
            {audioEnabled ? (
              <Volume2 className="size-5" />
            ) : (
              <VolumeX className="size-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id={`${audioId}-heading`}
              className="text-lg font-semibold text-[var(--text,#1f2933)]"
            >
              Audio di mode belajar
            </h2>
            <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
              Audio tidak pernah diputar otomatis. Anak atau pendamping menekan
              tombol putar bila dibutuhkan.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={audioEnabled}
          aria-labelledby={`${audioId}-heading`}
          onClick={() => {
            setAudioEnabled((v) => !v);
            setSaved(false);
            setError(null);
          }}
          className={cn(
            "mt-5 flex w-full min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2",
            audioEnabled
              ? "border-[var(--cermin-accent,#3d7c6b)] bg-[var(--accent-soft,#e6f2ee)]"
              : "border-[var(--cermin-border,#d9e2ec)] bg-white hover:bg-[var(--bg,#f7f4ef)]",
          )}
        >
          <span className="text-sm font-medium text-[var(--text,#1f2933)]">
            {audioEnabled
              ? "Tombol putar audio ditampilkan"
              : "Tombol putar audio disembunyikan"}
          </span>
          <span
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none",
              audioEnabled
                ? "bg-[var(--cermin-accent,#3d7c6b)]"
                : "bg-[var(--cermin-border,#d9e2ec)]",
            )}
            aria-hidden
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none",
                audioEnabled && "translate-x-5",
              )}
            />
          </span>
        </button>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5" aria-live="polite">
          {error ? (
            <p className="text-sm text-[var(--danger,#9b2c2c)]" role="alert">
              {error}
            </p>
          ) : null}
          {saved && !error ? (
            <p className="text-sm text-[var(--success,#2f6f4e)]" role="status">
              Preferensi disimpan. Siap dipakai di sesi berikutnya.
            </p>
          ) : null}
          {!saved && !error && dirty ? (
            <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
              Ada perubahan yang belum disimpan.
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          disabled={pending || !dirty}
          className="min-h-11 w-full cursor-pointer bg-[var(--cermin-accent,#3d7c6b)] text-white hover:bg-[var(--focus,#0b6e4f)] disabled:cursor-not-allowed sm:w-auto"
        >
          {pending ? "Menyimpan…" : "Simpan preferensi"}
        </Button>
      </div>
    </form>
  );
}
