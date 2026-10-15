"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share } from "lucide-react";
import { APP_VERSION } from "@/lib/app-version";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function subscribeDisplayMode(onStoreChange: () => void): () => void {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onStoreChange);
  window.addEventListener("appinstalled", onStoreChange);
  return () => {
    mq.removeEventListener("change", onStoreChange);
    window.removeEventListener("appinstalled", onStoreChange);
  };
}

function getStandaloneSnapshot(): boolean {
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || iosStandalone;
}

function getIosSnapshot(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Petunjuk pasang PWA: tombol install (Android/Chrome) atau panduan Share (iOS Safari).
 */
export function InstallHint() {
  const installed = useSyncExternalStore(
    subscribeDisplayMode,
    getStandaloneSnapshot,
    () => false,
  );
  const ios = useSyncExternalStore(
    () => () => undefined,
    getIosSnapshot,
    () => false,
  );

  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (installed) {
    return (
      <p className="text-sm text-[var(--success,#2f6f4e)]">
        CERMIN sudah terpasang di perangkat ini · v{APP_VERSION}
      </p>
    );
  }

  async function onInstall() {
    if (!deferred) return;
    setPending(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--cermin-border,#d9e2ec)] bg-[var(--surface,#ffffff)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft,#e6f2ee)] text-[var(--cermin-accent,#3d7c6b)]"
          aria-hidden
        >
          <Download className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-[var(--text,#1f2933)]">
            Pasang aplikasi
          </h2>
          <p className="mt-1 text-sm text-[var(--cermin-muted,#5c6b73)]">
            Pasang CERMIN di layar utama Android atau iPhone agar mudah dibuka
            seperti aplikasi. Versi saat ini:{" "}
            <span className="font-medium text-[var(--text,#1f2933)]">
              v{APP_VERSION}
            </span>
            .
          </p>
        </div>
      </div>

      {deferred ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void onInstall()}
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--cermin-accent,#3d7c6b)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--focus,#0b6e4f)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus,#0b6e4f)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <Download className="size-4" aria-hidden />
          {pending ? "Menyiapkan…" : "Pasang CERMIN"}
        </button>
      ) : ios ? (
        <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--text,#1f2933)]">
          <li>
            Ketuk tombol{" "}
            <Share
              className="mx-0.5 inline size-4 align-text-bottom text-[var(--cermin-accent,#3d7c6b)]"
              aria-label="Bagikan"
            />{" "}
            <strong>Bagikan</strong> di Safari.
          </li>
          <li>
            Pilih <strong>Tambah ke Layar Utama</strong> /{" "}
            <strong>Add to Home Screen</strong>.
          </li>
          <li>
            Konfirmasi nama <strong>CERMIN</strong>, lalu ketuk Tambah.
          </li>
        </ol>
      ) : (
        <p className="text-sm text-[var(--cermin-muted,#5c6b73)]">
          Di Chrome Android: buka menu ⋮ → <strong>Install app</strong> /{" "}
          <strong>Pasang aplikasi</strong>. Di komputer: ikon pasang di bilah
          alamat bila tersedia.
        </p>
      )}
    </div>
  );
}
