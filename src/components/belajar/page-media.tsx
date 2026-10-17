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
    <div className="flex flex-col items-center gap-2">
      {playing ? (
        <button
          type="button"
          onClick={onPauseClick}
          className="min-h-14 min-w-[12rem] rounded-2xl border-2 border-[#3d7c6b] bg-white px-6 py-3 text-xl font-semibold text-[#1f2933] shadow-sm hover:bg-[#eef6f2] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#3d7c6b]"
        >
          Jeda suara
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void onPlayClick()}
          disabled={loading}
          className="min-h-14 min-w-[12rem] rounded-2xl border-2 border-[#3d7c6b] bg-[#3d7c6b] px-6 py-3 text-xl font-semibold text-white shadow-sm hover:bg-[#34695b] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#3d7c6b] disabled:opacity-60"
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
