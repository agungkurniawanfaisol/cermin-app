# CERMIN — CERita MIRip Aku

Aplikasi web social-story learning untuk anak autistik. Role: Administrator, Terapis, Orang Tua. Anak tidak login; adult memandu child mode `/belajar`.

## Stack

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Better Auth · Prisma · Supabase (Postgres + Storage) · Vercel

## Jalankan lokal (Docker + hot reload)

```bash
cp .env.example .env.local
# Isi DATABASE_URL, DIRECT_URL, Supabase keys, BETTER_AUTH_SECRET
# Panduan: docs/SUPABASE-SETUP.md

docker compose up --build
```

Buka [http://localhost:5173](http://localhost:5173).

Ubah file di editor → reload otomatis di browser. Detail: [docs/DOCKER.md](docs/DOCKER.md).

Migrasi + seed (setelah env siap):

```bash
docker compose exec web pnpm exec prisma migrate deploy
docker compose exec web pnpm db:seed
```

## Tanpa Docker

```bash
pnpm install
pnpm dev
```

## Docs

| Dokumen                                            | Isi                  |
| -------------------------------------------------- | -------------------- |
| [docs/ROADMAP.md](docs/ROADMAP.md)                 | Status & urutan      |
| [docs/BRD.md](docs/BRD.md) / [PRD.md](docs/PRD.md) | Requirements         |
| [docs/ERD.md](docs/ERD.md)                         | Data model           |
| [docs/ACCESS-CONTROL.md](docs/ACCESS-CONTROL.md)   | Roles & authz        |
| [docs/DOCKER.md](docs/DOCKER.md)                   | Compose + hot reload |
| [docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md)   | Setup Supabase       |

## Tes

```bash
pnpm test          # unit
pnpm test:e2e      # butuh DATABASE_URL + app running
```
