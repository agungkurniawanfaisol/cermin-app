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
