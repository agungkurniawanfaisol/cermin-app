# Prisma (CERMIN MVP)

## Apply migrations + seed

Requires a live Supabase Postgres with `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) in `.env.local`.

```bash
# From repo root / worktree
pnpm db:migrate --name init   # or: pnpm exec prisma migrate deploy
pnpm db:seed
```

Offline SQL for the initial schema lives in `migrations/*_init/migration.sql`. Until `.env.local` points at Supabase, migrate/seed cannot run against a real database.

## Prisma 7 notes

- Connection URL is in `prisma.config.ts` (not `schema.prisma`).
- Runtime client uses `@prisma/adapter-pg` (`src/lib/db.ts`, `prisma/seed.ts`).

## Private media bucket (`cermin-media`)

`MediaAsset.storageBucket` defaults to `cermin-media`. That Supabase Storage bucket **must be private** (Public: OFF, no anon SELECT policies). App code uploads with the service role and serves files only via authz-gated signed URLs (`GET /api/media/[id]`, TTL 120s). Setup checklist: `docs/ROADMAP.md` §3.4–3.8.
