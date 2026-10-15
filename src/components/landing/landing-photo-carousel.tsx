"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type LandingSlide = {
  src: string;
  alt: string;
  caption: string;
};

type LandingPhotoCarouselProps = {
  slides: LandingSlide[];
  /** Soft autoplay interval in ms; ignored when reduced-motion. */
  autoplayMs?: number;
};

export function LandingPhotoCarousel({
  slides,
  autoplayMs = 6000,
}: LandingPhotoCarouselProps) {
  const labelId = useId();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useRef(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotion.current = mq.matches;
    const onChange = () => {
      reduceMotion.current = mq.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const go = useCallback(
    (next: number) => {
      const len = slides.length;
      if (len === 0) return;
      setIndex(((next % len) + len) % len);
    },
    [slides.length],
  );

  useEffect(() => {
    if (paused || reduceMotion.current || slides.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, autoplayMs);
    return () => window.clearInterval(id);
  }, [paused, autoplayMs, slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[index]!;

  return (
    <div
      className="mx-auto w-full max-w-7xl px-4 sm:px-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div
        role="region"
        aria-roledescription="carousel"
        aria-labelledby={labelId}
        className="relative overflow-hidden rounded-2xl border border-[var(--cermin-border)] bg-[var(--surface)] shadow-[0_16px_40px_-28px_color-mix(in_srgb,var(--cermin-accent)_30%,transparent)]"
      >
        <p id={labelId} className="sr-only">
          Galeri foto CERMIN
        </p>

        <div
          className="relative aspect-[16/9] w-full"
          onTouchStart={(e) => {
            touchStartX.current = e.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current;
            const end = e.changedTouches[0]?.clientX;
            touchStartX.current = null;
            if (start == null || end == null) return;
            const delta = end - start;
            if (Math.abs(delta) < 48) return;
            go(index + (delta < 0 ? 1 : -1));
          }}
        >
          {slides.map((s, i) => (
            <div
              key={s.src}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} dari ${slides.length}`}
              aria-hidden={i !== index}
              className={`absolute inset-0 transition-opacity duration-500 ease-out motion-reduce:transition-none ${
                i === index ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <Image
                src={s.src}
                alt={s.alt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 64rem"
                priority={i === 0}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--cermin-border)] bg-[var(--surface)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p
            className="min-h-[2.75rem] w-full text-sm leading-relaxed text-[var(--cermin-muted)] sm:text-base"
            aria-live="polite"
          >
            {slide.caption}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg border border-[var(--cermin-border)] text-[var(--text)] transition-colors hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              aria-label="Foto sebelumnya"
              onClick={() => go(index - 1)}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <div className="flex items-center gap-1.5 px-1" role="tablist" aria-label="Pilih foto">
              {slides.map((s, i) => (
                <button
                  key={s.src}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Tampilkan foto ${i + 1}`}
                  className={`size-2.5 cursor-pointer rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
                    i === index
                      ? "bg-[var(--cermin-accent)]"
                      : "bg-[var(--cermin-border)] hover:bg-[color-mix(in_srgb,var(--cermin-accent)_40%,var(--cermin-border))]"
                  }`}
                  onClick={() => go(i)}
                />
              ))}
            </div>
            <button
              type="button"
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg border border-[var(--cermin-border)] text-[var(--text)] transition-colors hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              aria-label="Foto berikutnya"
              onClick={() => go(index + 1)}
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
