import type { MetadataRoute } from "next";
import { APP_NAME, APP_VERSION } from "@/lib/app-version";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: `/?v=${APP_VERSION}`,
    name: `${APP_NAME} — Cerita Mirip Aku`,
    short_name: APP_NAME,
    description:
      "Platform cerita sosial untuk pembelajaran dipandu anak autistik. Versi " +
      APP_VERSION,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f7f4ef",
    theme_color: "#3d7c6b",
    lang: "id",
    dir: "ltr",
    categories: ["education", "medical", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
