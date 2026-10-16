"use client";

import { useEffect } from "react";
import { APP_VERSION } from "@/lib/app-version";

/**
 * Registers the installable service worker (production HTTPS).
 * Dev: unregister — SW navigate fallback ke offline.html + reload
 * bisa terasa seperti loop refresh di localhost.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Development: bersihkan SW lama agar tidak intercept navigasi.
    if (process.env.NODE_ENV === "development") {
      void navigator.serviceWorker.getRegistrations().then((regs) =>
        Promise.all(regs.map((r) => r.unregister())),
      );
      return;
    }

    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const isSecure = window.location.protocol === "https:" || isLocal;
    if (!isSecure) return;

    const swUrl = `/sw.js?v=${encodeURIComponent(APP_VERSION)}`;
    void navigator.serviceWorker.register(swUrl, { scope: "/" }).catch(() => {
      /* ignore — install still works via manifest on some browsers */
    });
  }, []);

  return null;
}
