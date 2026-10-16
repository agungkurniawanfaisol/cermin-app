# Docker — CERMIN (dev + hot reload)

| Field    | Value                                      |
| -------- | ------------------------------------------ |
| Version  | 0.2                                        |
| Date     | 2026-10-15                                 |
| Mode     | Development only (`next dev --turbopack`)  |
| DB       | Supabase cloud — bukan Postgres di Compose |
| App root | Repository root (`/`, bukan `.worktrees/`) |

## 1. Apa yang dijalankan Docker

| Service | Peran                                     |
| ------- | ----------------------------------------- |
| `web`   | Next.js App Router, hot reload, port 5173 |

Postgres, Better Auth sessions, dan Storage **tidak** di-compose. Login = Better Auth. DB + Storage = Supabase (lihat [SUPABASE-SETUP.md](./SUPABASE-SETUP.md)).

## 2. Prasyarat

1. Docker Desktop / Docker Engine + Compose v2
2. Kode app di **root repo** (`package.json`, `src/`, `prisma/` — sudah ada)
3. `.env.local` dari `.env.example` (nilai Supabase terisi)

## 3. Perintah

```bash
cp .env.example .env.local
# edit .env.local — lihat docs/SUPABASE-SETUP.md

docker compose up --build
```

Buka [http://localhost:5173](http://localhost:5173).

Stop: `Ctrl+C` atau `docker compose down`.

Install dependency baru:

```bash
docker compose exec web pnpm add <paket>
```

Prisma (butuh `DATABASE_URL` + `DIRECT_URL`):

```bash
docker compose exec web pnpm exec prisma migrate deploy
docker compose exec web pnpm db:seed
# atau selama develop:
docker compose exec web pnpm db:migrate
```

## 4. Hot reload

- Seluruh root proyek di-bind ke `/app`.
- `WATCHPACK_POLLING=true` + `CHOKIDAR_USEPOLLING=true` untuk WSL2 / Docker Desktop.
- Ubah file di editor host → Next.js Fast Refresh di browser.
- `node_modules` dan `.next` memakai named volume (`cermin_node_modules`, `cermin_next`) agar tidak tertimpa folder kosong dari host.

Jika reload tidak jalan di WSL: pastikan proyek di filesystem Linux (`/home/...`), bukan `/mnt/c/...`.

## 5. Tanpa Docker (opsional)

```bash
pnpm install
pnpm dev
```

Masih butuh `.env.local` yang sama.

## 6. Produksi

Compose ini **bukan** image production. Deploy: Vercel + Supabase (lihat [ROADMAP.md](./ROADMAP.md)).
