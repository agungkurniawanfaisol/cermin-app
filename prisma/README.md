# Prisma (CERMIN MVP)

## Apply migrations + seed

Requires a live Supabase Postgres with `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) in `.env.local`.

```bash
# From repo root (atau via Docker — lihat docs/DOCKER.md)
pnpm exec prisma migrate deploy
pnpm db:seed

# Docker:
# docker compose exec web pnpm exec prisma migrate deploy
# docker compose exec web pnpm db:seed
```

Offline SQL lives in `migrations/`. Until `.env.local` points at Supabase, migrate/seed cannot run against a real database.

## Prisma 7 notes

- Connection URL is in `prisma.config.ts` (not `schema.prisma`).
- Runtime client uses `@prisma/adapter-pg` (`src/lib/db.ts`, `prisma/seed.ts`).

## Private media bucket (`cermin-media`)

`MediaAsset.storageBucket` defaults to `cermin-media`. That Supabase Storage bucket **must be private** (Public: OFF, no anon SELECT policies). App code uploads with the service role and serves files only via authz-gated signed URLs (`GET /api/media/[id]`, TTL 120s). Checklist: `docs/SUPABASE-SETUP.md`.
