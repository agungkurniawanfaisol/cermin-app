# Changelog

Semua perubahan penting dicatat di sini. Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/), versi [SemVer](https://semver.org/lang/id/).

## [0.2.0] — 2026-10-15

### Ditambahkan

- PWA: web app manifest, ikon (192/512/maskable/apple-touch), service worker, halaman offline.
- Petunjuk pasang di Android (prompt install) dan iOS Safari (Tambah ke Layar Utama) di Pengaturan.
- Versioning semver dari `package.json` (`src/lib/app-version.ts`), ditampilkan di Pengaturan dan metadata.

### Catatan instalasi

- **Android (Chrome):** menu ⋮ → Pasang aplikasi, atau tombol di Pengaturan bila prompt tersedia.
- **iOS (Safari):** Bagikan → Tambah ke Layar Utama.
- Butuh HTTPS (atau localhost) agar service worker dan install prompt aktif.

## [0.1.0] — 2026-10-15

### Ditambahkan

- MVP CERMIN: auth, murid, cerita, sesi, media privat, dasbor dewasa, child mode.
