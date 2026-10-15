# Roadmap — CERMIN

| Field        | Value                         |
| ------------ | ----------------------------- |
| Version      | 0.1                           |
| Date         | 2026-10-15                    |
| Architecture | Modular monolith (Approach A) |

## 0. Discovery findings (baseline)

| Item            | Finding                                               |
| --------------- | ----------------------------------------------------- |
| Repo state      | Empty directory — no Next.js app, no git, no packages |
| Framework       | **Proposed:** Next.js App Router + TypeScript         |
| Package manager | **Proposed:** pnpm (or npm if preferred at scaffold)  |
| Database        | Supabase Postgres (chosen)                            |
| ORM             | Prisma                                                |
| Auth            | Better Auth                                           |
| Storage         | Supabase Storage (private)                            |
| Deploy          | Vercel                                                |
| Reuse           | None yet — greenfield                                 |

## 1. Phases

### Phase 0 — Foundation (setelah approval)

- [ ] `git init` + scaffold Next.js (App Router, TS, Tailwind, ESLint)
- [ ] shadcn/ui init
- [ ] Prisma + Supabase connection
- [ ] Better Auth + tables
- [ ] Env templates + Vercel project
- [ ] Seed Admin + 2 kategori awal

### Phase 1 — MVP inti belajar

1. User invite + role + status
2. Student CRUD + TherapistAssignment history + ParentLink
3. Categories + Stories + Pages + Media upload (private)
4. Story status flow (draft → … → published) — publish Admin
5. Child mode `/belajar` + LearningSession + Observation
6. Audit log tulis (UI list sederhana opsional)
7. Tes policy + E2E jalur utama

### Phase 2 — Enrichment

- Evaluation + EvaluationItem UI + SessionEvaluationResponse
- StoryVersion UI / restore
- Preferensi teks/audio lebih kaya
- Audit log viewer Admin
- Hardening rate-limit invite, media virus scanning policy (jika diperlukan)

### Phase 3 — Optional (tidak dijanjikan)

- Multi-tenant
- Child accounts
- i18n EN

## 2. Implementation sequence (detail Phase 0–1)

| Step | Deliverable                              |
| ---- | ---------------------------------------- |
| 1    | Scaffold + CI lint/test skeleton         |
| 2    | Supabase project + Prisma schema migrate |
| 3    | Better Auth login/logout + middleware    |
| 4    | Admin invite flow                        |
| 5    | Murid + assignment + parent link         |
| 6    | Cerita + halaman                         |
| 7    | Media private upload + signed access     |
| 8    | Child mode reader                        |
| 9    | Session + observasi                      |
| 10   | E2E + a11y smoke + deploy preview        |

## 3. Cara setup Supabase (diminta)

Ikuti langkah ini saat Phase 0 dimulai (belum mengeksekusi sekarang — menunggu approval implementasi).

### 3.1 Buat proyek

1. Buka [https://supabase.com](https://supabase.com) → New project.
2. Catat region terdekat.
3. Simpan **Database password** di password manager.

### 3.2 Ambil connection strings

Di **Project Settings → Database**:

- **Connection string (URI)** untuk Prisma — prefer **Transaction** pooler (port 6543) untuk serverless/Vercel, plus `?pgbouncer=true`.
- **Direct** connection (port 5432) untuk migrasi Prisma (`prisma migrate`).

Contoh env:

```bash
# .env.local (jangan commit)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

Di `schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 3.3 Jangan pakai Supabase Auth untuk app login

CERMIN memakai **Better Auth**. Matikan ketergantungan login Supabase Auth di aplikasi. Postgres + Storage saja yang dipakai dari Supabase.

### 3.4 Storage bucket private

1. **Storage → New bucket** → nama `cermin-media`.
2. **Public bucket: OFF**.
3. Tidak menambah policy publik `SELECT` untuk anon.
4. Akses file hanya via **service role di server** setelah cek otorisasi app, lalu:

```ts
// pseudocode
await supabaseAdmin.storage
  .from("cermin-media")
  .createSignedUrl(storageKey, 120); // detik
```

5. Upload path disarankan: `stories/{storyId}/pages/{pageId}/{uuid}.{ext}`.

### 3.5 API keys di env

Dari **Project Settings → API**:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
# Jangan expose service role ke client
SUPABASE_SERVICE_ROLE_KEY="..."
```

Client browser **tidak** memakai service role. Upload melalui Server Action / Route Handler.

### 3.6 Migrasi

```bash
pnpm prisma migrate dev --name init
pnpm prisma db seed   # admin + kategori
```

### 3.7 Vercel

1. Link repo ke Vercel.
2. Set env yang sama (Database, Better Auth secret, Supabase keys).
3. Build: `prisma generate && next build`.
4. Pastikan `DIRECT_URL` tersedia untuk migrate di CI jika memakai migrate-on-deploy.

### 3.8 Checklist keamanan Supabase

- [ ] Bucket `cermin-media` non-public
- [ ] Tidak ada policy anon read/write
- [ ] Service role hanya di server env
- [ ] RLS: opsional defense-in-depth; **source of truth authz tetap app policy**
- [ ] Backup/retention sesuai kebijakan lembaga

## 4. Risks register

| Risk                       | Severity | Mitigation                                         |
| -------------------------- | -------- | -------------------------------------------------- |
| Empty greenfield delay     | Med      | Scaffold segera setelah approval                   |
| Media leak                 | High     | Private bucket + signed TTL + assertCanAccessMedia |
| IDOR                       | High     | Policy helpers wajib di setiap action              |
| Prisma + pooler mishook    | Med      | `DIRECT_URL` untuk migrate                         |
| Scope creep evaluasi/versi | Med      | Schema sekarang, UI Phase 2                        |

## 5. Definition of Done — MVP

Lihat acceptance criteria di [PRD.md](./PRD.md) §8 dan [TEST-PLAN.md](./TEST-PLAN.md).

## 6. Gate

**Tidak ada scaffold/implementasi besar sampai dokumen planning ini disetujui.**
