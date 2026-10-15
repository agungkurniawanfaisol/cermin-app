# Roadmap — CERMIN

| Field        | Value                         |
| ------------ | ----------------------------- |
| Version      | 0.2                           |
| Date         | 2026-10-15                    |
| Architecture | Modular monolith (Approach A) |

## 0. Status repo (aktual)

| Item            | Status                                                                      |
| --------------- | --------------------------------------------------------------------------- |
| Lokasi kode     | **Root repo** (`src/`, `prisma/`, `package.json`) — bukan `.worktrees/`     |
| Framework       | Next.js 16 App Router + TypeScript + Tailwind + shadcn                      |
| Package manager | pnpm 12                                                                     |
| Local run       | **Docker Compose + hot reload** ([DOCKER.md](./DOCKER.md)); atau `pnpm dev` |
| Database        | Supabase Postgres + Prisma 7                                                |
| Auth            | Better Auth (email/password + invite; `disableSignUp`)                      |
| Storage         | Supabase Storage private `cermin-media`                                     |
| Deploy          | Vercel                                                                      |
| MVP Tasks 1–10  | Implemented on `main` (lihat plan di `docs/superpowers/plans/`)             |

> Catatan: folder `.worktrees/` hanya pernah dipakai sementara untuk isolasi agent; kode sumber kanonik ada di root. Jangan kembangkan fitur di dalam `.worktrees/`.

## 1. Phases

### Phase 0 — Foundation

- [x] Scaffold Next.js (App Router, TS, Tailwind, ESLint)
- [x] Docker Compose dev + hot reload ([DOCKER.md](./DOCKER.md))
- [x] shadcn/ui
- [x] Prisma schema + migrations + seed
- [x] Better Auth + dashboard shell
- [ ] Env Supabase terisi + migrate/seed di lingkungan nyata ([SUPABASE-SETUP.md](./SUPABASE-SETUP.md))
- [ ] Vercel project + preview deploy

### Phase 1 — MVP inti belajar

- [x] User invite + role + status
- [x] Student CRUD + TherapistAssignment history + ParentLink
- [x] Categories + Stories + Pages + Media upload (private)
- [x] Story status flow — publish Admin
- [x] Child mode `/belajar` + LearningSession + Observation
- [x] Audit log tulis (tanpa UI list penuh)
- [x] Unit policy tests + Playwright specs (E2E butuh DB)

### Phase 2 — Enrichment

- Evaluation + EvaluationItem UI + SessionEvaluationResponse
- StoryVersion UI / restore
- Preferensi teks/audio lebih kaya
- Audit log viewer Admin
- Hardening rate-limit invite, media scanning (jika diperlukan)

### Phase 3 — Optional (tidak dijanjikan)

- Multi-tenant
- Child accounts
- i18n EN

## 2. Cara jalanin lokal (sekarang)

```bash
cp .env.example .env.local
# isi DATABASE_URL, DIRECT_URL, Supabase keys, BETTER_AUTH_SECRET

docker compose up --build
# http://localhost:3000

docker compose exec web pnpm exec prisma migrate deploy
docker compose exec web pnpm db:seed
```

Detail: [DOCKER.md](./DOCKER.md), [SUPABASE-SETUP.md](./SUPABASE-SETUP.md).

## 3. Risks register

| Risk                       | Severity | Mitigation                                         |
| -------------------------- | -------- | -------------------------------------------------- |
| Media leak                 | High     | Private bucket + signed TTL + assertCanAccessMedia |
| IDOR                       | High     | Policy helpers wajib di setiap action              |
| Prisma + pooler mishook    | Med      | `DIRECT_URL` untuk migrate                         |
| Scope creep evaluasi/versi | Med      | Schema ada; UI Phase 2                             |
| E2E tanpa DB               | Low      | Specs skip jika tidak ada `DATABASE_URL`           |

## 4. Definition of Done — MVP runtime

- [ ] Supabase terhubung; migrate + seed sukses
- [ ] Login admin seed; invite terapis/ortu
- [ ] Murid + assignment + cerita + media + sesi child mode end-to-end
- [ ] Acceptance di [PRD.md](./PRD.md) §8 dan [TEST-PLAN.md](./TEST-PLAN.md)

## 5. Gate berikutnya

Implementasi kode MVP sudah di root. **Blocker operasional:** isi `.env.local` + Supabase, lalu verifikasi lewat Docker.
