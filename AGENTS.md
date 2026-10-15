# AGENTS — CERMIN

Panduan singkat untuk agent AI di repo ini.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Produk

CERMIN (CERita MIRip Aku): social-story learning untuk anak autistik. Role: `ADMIN`, `TERAPIS`, `ORANG_TUA`. Anak **tidak** punya akun; adult membuka child mode `/belajar`.

Bahasa produk: **Indonesia**.

## Lokasi kode

- **Kanonik:** root repo (`src/`, `prisma/`, `package.json`, Docker files).
- **Jangan** menaruh implementasi di `.worktrees/` — itu hanya isolasi sementara yang sudah digabung ke `main`.

## Stack

| Lapisan   | Pilihan                                        |
| --------- | ---------------------------------------------- |
| App       | Next.js App Router + TypeScript + Tailwind     |
| Package   | pnpm                                           |
| Local run | Docker Compose + hot reload (`docs/DOCKER.md`) |
| DB        | Supabase Postgres + Prisma                     |
| Auth app  | Better Auth (bukan Supabase Auth)              |
| Media     | Supabase Storage bucket privat `cermin-media`  |
| Deploy    | Vercel                                         |

## Baca dulu (sesuai tugas)

| Topik           | Sumber                       |
| --------------- | ---------------------------- |
| Bisnis / scope  | `docs/BRD.md`, `docs/PRD.md` |
| Authz           | `docs/ACCESS-CONTROL.md`     |
| Skema data      | `docs/ERD.md`                |
| UI              | `docs/UI-DESIGN-SYSTEM.md`   |
| Tes             | `docs/TEST-PLAN.md`          |
| Status / urutan | `docs/ROADMAP.md`            |
| Docker          | `docs/DOCKER.md`             |
| Supabase        | `docs/SUPABASE-SETUP.md`     |
| Plan MVP        | `docs/superpowers/plans/`    |

## Invarian non-nego

1. Authz di **server** tiap query/mutasi. UI hide ≠ security.
2. Cegah IDOR lewat `assertCanAccessStudent` / media / session helpers.
3. Media: bucket privat + signed URL TTL pendek setelah authz.
4. Rahasia hanya env server. Jangan `NEXT_PUBLIC_` untuk service role / DB password.
5. Child mode: tenang, no autoplay, Comic Sans + fallback.
6. Local default: `docker compose up --build` dengan hot reload.
7. **Setiap UI wajib usable di mobile dan desktop** (mobile-first). Sebelum selesai, cek mental ~375px dan ~1280px: tidak overflow-x, touch target cukup, CTA terbaca. Lihat `.cursor/rules/responsive-viewport.mdc` dan skill `cermin-responsive-ui`.
