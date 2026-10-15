# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pengguna akun: **Administrator**, **Terapis**, dan **Orang Tua** di satu lembaga. Mereka mengelola profil murid, cerita sosial, media, sesi belajar dipandu, dan observasi.

**Anak** tidak punya akun login. Orang dewasa yang berwenang membuka _child mode_ (`/belajar`) dan memandu sesi bersama anak.

## Product Purpose

CERMIN (**CERita MIRip Aku**) mendukung pembelajaran _social story_ bagi anak autistik: satu sistem untuk murid, konten, media privat, sesi, dan jejak observasi — mengganti file cerita yang tersebar tanpa hak akses atau riwayat sesi.

Keberhasilan awal: undangan + tautan murid cepat; terapis menjalankan satu sesi child mode end-to-end; tidak ada akses lintas-relasi; child mode tanpa autoplay audio.

## Positioning

Guided session untuk anak (bukan akun anak), otorisasi **peran + relasi** di server, media privat dengan signed URL TTL pendek, dan antarmuka tenang yang sengaja menghindari overstimulation serta gamifikasi kompetitif.

## Operating Context

- Dasbor dewasa: `/dashboard` (murid, cerita, sesi, pengguna admin, pengaturan).
- Child mode: `/belajar` — dibuka orang dewasa setelah memilih murid + cerita terbit.
- Auth: Better Auth (email/kata sandi + undangan); bukan Supabase Auth.
- Data: Supabase Postgres + Storage privat `cermin-media`; Prisma; deploy target Vercel; lokal Docker Compose + hot reload.
- Bahasa produk: **Bahasa Indonesia saja**.

## Capabilities and Constraints

**Ada / diizinkan:** kelola user & undangan; CRUD murid + penugasan terapis + tautan ortu; kategori/cerita/halaman/media; alur status cerita & publish Admin; LearningSession + observasi; preferensi teks/audio; foto profil keluarga murid (murid/ayah/ibu, opsional); audit tulis.

**Di luar MVP / tidak dijanjikan:** multi-tenant; akun login anak; leaderboard/skor hukuman/gamifikasi kompetitif; billing/marketplace; app native iOS/Android; i18n Inggris.

**Terminologi:** murid (profil anak), child mode / belajar, cerita sosial, observasi, penugasan, tautan orang tua.

## Brand Commitments

- Nama produk: **CERMIN** (CERita MIRip Aku).
- Suara UI: jelas, tenang, Bahasa Indonesia; tanpa copy kompetitif atau hukuman.
- Identitas visual incumbent (dokumentasikan lewat `/impeccable document`): tema terang, aksen hijau tenang (`#3d7c6b` / token CERMIN), tipografi Comic Sans MS + Comic Neue; hormati `docs/UI-DESIGN-SYSTEM.md` dan rule calm-light.

## Evidence on Hand

- Spec produk: `docs/BRD.md`, `docs/PRD.md`, `docs/ERD.md`, `docs/ACCESS-CONTROL.md`, `docs/UI-DESIGN-SYSTEM.md`, `docs/ROADMAP.md`.
- Foto landing di `public/images/landing/` (bukan wajah anak).
- Tidak ada testimoni pelanggan atau benchmark publik yang boleh dikarang.

## Product Principles

1. **Keamanan di server** — UI hide ≠ otorisasi; cegah IDOR pada murid/media/sesi.
2. **Anak dipandu, bukan diloginkan** — pengalaman tenang di child mode.
3. **Privasi media** — bucket privat; signed URL pendek setelah authz.
4. **Rendah stimulasi** — light theme, tanpa autoplay, tanpa flash/gamifikasi hukuman.
5. **Satu lembaga, Bahasa Indonesia** — fokus klinik/rumah, bukan platform multi-bahasa.

## Accessibility & Inclusion

Target WCAG 2.2 AA untuk kontras dan fokus; navigasi keyboard; hormati `prefers-reduced-motion`; child mode tanpa autoplay; ukuran teks/audio dapat dikonfigurasi; dirancang untuk anak autistik dan orang dewasa yang mendampingi.
