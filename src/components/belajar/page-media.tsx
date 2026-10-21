"use client";

import { useEffect, useRef, useState } from "react";

type MediaRef = {
  id: string;
  altText: string | null;
  url?: string | null;
};

async function fetchMediaUrl(mediaId: string): Promise<string> {
  const res = await fetch(`/api/media/${mediaId}`);
  const body = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !body.url) {
    throw new Error(body.error ?? "Gagal memuat media");
  }
  return body.url;
}

type ImageVariant = "portrait" | "story";

const IMAGE_SIZE: Record<ImageVariant, string> = {
  /* Portrait: lebih besar, tetap muat bersama teks + nav */
  portrait:
    "mx-auto max-h-[min(50dvh,22rem)] w-full object-contain sm:max-h-[min(54dvh,26rem)] md:max-h-[min(58dvh,30rem)]",
  story:
    "mx-auto max-h-[min(44dvh,18rem)] w-full object-contain sm:max-h-[min(48dvh,22rem)] md:max-h-[min(50dvh,24rem)]",
};

export function PageImage({
  image,
  variant = "story",
}: {
  image: MediaRef;
  variant?: ImageVariant;
}) {
  const [url, setUrl] = useState<string | null>(image.url ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (image.url) {
      setUrl(image.url);
      setError(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const signed = await fetchMediaUrl(image.id);
        if (!cancelled) setUrl(signed);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Gagal memuat gambar",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [image.id, image.url]);
  if (error) {
    return (
      <p className="text-center text-base text-[#5c6b73]" role="status">
        {error}
      </p>
    );
  }

  if (!url) {
    return (
      <p className="text-center text-base text-[#5c6b73]" role="status">
        Memuat gambar…
      </p>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed URL from private bucket
    <img
      src={url}
      alt={image.altText ?? "Gambar cerita"}
      className={IMAGE_SIZE[variant]}
      loading="eager"
      decoding="async"
      onError={() => {
        void fetchMediaUrl(image.id)
          .then((newUrl) => setUrl(newUrl))
          .catch(() => setError("Gagal memuat gambar"));
      }}
    />
  );
}

const SOUND_BAR_COUNT = 7;

function SoundWaveGraphic({ playing }: { playing: boolean }) {
  return (
    <div
      className={
        playing
          ? "belajar-sound-viz belajar-sound-viz--playing"
          : "belajar-sound-viz belajar-sound-viz--idle"
      }
      aria-hidden
    >
      {Array.from({ length: SOUND_BAR_COUNT }, (_, i) => (
        <span key={i} className="belajar-sound-viz__bar" />
      ))}
    </div>
  );
}

export function PageAudioButton({ audio }: { audio: MediaRef }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(audio.url ?? null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (audio.url) {
      setUrl(audio.url);
    }
  }, [audio.url]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  async function onPlayClick() {
    setError(null);
    setLoading(true);
    try {
      let signed = url;
      if (!signed) {
        signed = await fetchMediaUrl(audio.id);
        setUrl(signed);
      }

      if (!audioRef.current || audioRef.current.src !== signed) {
        audioRef.current?.pause();
        const el = new Audio(signed);
        el.preload = "none";
        el.addEventListener("ended", () => setPlaying(false));
        el.addEventListener("pause", () => setPlaying(false));
        audioRef.current = el;
      }

      await audioRef.current.play();
      setPlaying(true);
    } catch (err) {
      if (url) {
        try {
          const fresh = await fetchMediaUrl(audio.id);
          setUrl(fresh);
          if (audioRef.current) {
            audioRef.current.src = fresh;
            await audioRef.current.play();
            setPlaying(true);
            return;
          }
        } catch {
          // ignore retry error
        }
      }
      setError(err instanceof Error ? err.message : "Gagal memutar suara");
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }

  function onPauseClick() {
    audioRef.current?.pause();
    setPlaying(false);
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3">
      <div
        className={
          playing
            ? "flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-[var(--belajar-accent,#3d7c6b)] bg-[var(--belajar-accent-soft,#e6f2ee)] px-4 py-3"
            : "flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-[var(--belajar-line,#c5d4cc)] bg-white px-4 py-3"
        }
      >
        <SoundWaveGraphic playing={playing} />
        <p
          className="text-center text-base font-medium text-[var(--belajar-quiet,#5c6b73)]"
          role="status"
          aria-live="polite"
        >
          {playing
            ? "Sedang diputar"
            : loading
              ? "Memuat suara…"
              : "Suara cerita"}
        </p>
      </div>

      {playing ? (
        <button
          type="button"
          onClick={onPauseClick}
          className="inline-flex min-h-14 w-full min-w-[12rem] items-center justify-center rounded-2xl border-2 border-[var(--belajar-accent,#3d7c6b)] bg-white px-6 py-3 text-xl font-semibold text-[var(--belajar-ink,#1f2933)] shadow-sm hover:bg-[var(--belajar-accent-soft,#e6f2ee)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)]"
        >
          Jeda suara
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void onPlayClick()}
          disabled={loading}
          className="inline-flex min-h-14 w-full min-w-[12rem] items-center justify-center rounded-2xl border-2 border-[var(--belajar-accent,#3d7c6b)] bg-[var(--belajar-accent,#3d7c6b)] px-6 py-3 text-xl font-semibold text-white shadow-sm hover:bg-[#34695b] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)] disabled:opacity-60"
        >
          {loading ? "Memuat…" : "Putar suara"}
        </button>
      )}
      {error ? (
        <p className="text-base text-[#9b1c1c]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
