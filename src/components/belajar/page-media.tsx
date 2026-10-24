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
  /* Portrait isi hampir 1 layar di portrait; di landscape menyesuaikan kontainer (max-h-full) */
  portrait:
    "mx-auto h-auto max-h-[min(68dvh,34rem)] w-full object-contain sm:max-h-[min(72dvh,36rem)] landscape:max-h-full landscape:max-w-full landscape:h-auto landscape:w-auto",
  story:
    "mx-auto max-h-[min(40dvh,18rem)] w-full object-contain sm:max-h-[min(48dvh,22rem)] landscape:max-h-[min(28dvh,12rem)]",
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

const SOUND_BAR_COUNT = 5;

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

  const label = playing
    ? "Jeda suara"
    : loading
      ? "Memuat suara…"
      : "Putar suara";

  return (
    <div className="mx-auto flex w-full max-w-[14rem] flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => {
          if (playing) onPauseClick();
          else void onPlayClick();
        }}
        disabled={loading}
        aria-pressed={playing}
        aria-label={label}
        className={
          playing
            ? "group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--belajar-accent,#3d7c6b)] bg-[var(--belajar-accent-soft,#e6f2ee)] px-3 py-2 text-[var(--belajar-accent,#3d7c6b)] transition-colors hover:bg-[color-mix(in_srgb,var(--belajar-accent-soft,#e6f2ee)_85%,white)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)] disabled:opacity-60"
            : "group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--belajar-accent,#3d7c6b)] bg-[var(--belajar-accent,#3d7c6b)] px-3 py-2 text-white transition-colors hover:bg-[#34695b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--belajar-focus,#0b6e4f)] disabled:opacity-60"
        }
      >
        <SoundWaveGraphic playing={playing} />
        <span
          className={
            playing
              ? "text-sm font-medium text-[var(--belajar-ink,#1f2933)]"
              : "text-sm font-medium text-white"
          }
          role="status"
          aria-live="polite"
        >
          {label}
        </span>
      </button>
      {error ? (
        <p className="text-center text-sm text-[#9b1c1c]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Dock audio di bawah tengah halaman (preview + sesi). */
export function PageAudioDock({
  audios,
}: {
  audios: MediaRef[];
}) {
  if (audios.length === 0) return null;
  return (
    <div
      className="mx-auto flex w-full max-w-sm flex-col items-center gap-2 px-2 pt-1.5 pb-0.5"
      role="group"
      aria-label="Suara cerita"
    >
      {audios.map((audio) => (
        <PageAudioButton key={audio.id} audio={audio} />
      ))}
    </div>
  );
}
