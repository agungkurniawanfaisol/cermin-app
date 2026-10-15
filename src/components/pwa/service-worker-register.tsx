"use client";

import { useEffect } from "react";
import { APP_VERSION } from "@/lib/app-version";

/**
 * Registers the installable service worker (production / HTTPS / localhost).
 * SW file busted by app version so updates pick up after deploy.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

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
