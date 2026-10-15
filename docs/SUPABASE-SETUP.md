# Setup Supabase — CERMIN

Panduan setup di dashboard Supabase. Login aplikasi memakai **Better Auth**, bukan Supabase Auth.

| Field   | Value                        |
| ------- | ---------------------------- |
| Version | 0.2                          |
| Date    | 2026-10-15                   |
| Dipakai | Postgres + Storage (private) |
| Tidak   | Supabase Auth untuk login    |

---

## Checklist singkat

- [x] Proyek Supabase dibuat (region dekat, password DB disimpan)
- [x] Catat `PROJECT_REF`, URI pooler **6543**, URI direct **5432**
- [x] Bucket Storage `cermin-media` — **Public = OFF**
- [x] Tidak ada Storage policy anon read/write
- [x] Salin URL + **service_role** ke `.env.local` (service role hanya server / Docker)
- [x] Jalankan migrate + seed dari root atau `docker compose exec web …`
- [x] Jangan pakai Supabase Auth untuk login CERMIN

> Status 2026-10-15: lingkungan lokal sudah terhubung; migrate + seed + bucket `cermin-media` terverifikasi.

---

## 1. Buat proyek

1. Buka [https://supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. **Database password**: kuat, simpan di password manager.
3. **Region**: terdekat (contoh Singapore).
4. Catat **Reference ID** (Project Settings → General).

---

## 2. Connection string untuk Prisma

**Project Settings → Database** (atau Connect).

| Env            | Port                      | Dipakai untuk                                     |
| -------------- | ------------------------- | ------------------------------------------------- |
| `DATABASE_URL` | 6543 (Transaction pooler) | Runtime app / Docker / Vercel (`?pgbouncer=true`) |
| `DIRECT_URL`   | 5432 (direct / session)   | `prisma migrate`                                  |

Contoh di `.env.local` — lihat `.env.example` di root.

Di Prisma 7, URL ada di `prisma.config.ts` (bukan di `schema.prisma`).

---

## 3. Storage bucket private

1. **Storage → New bucket** → `cermin-media`.
2. **Public: OFF**.
3. Jangan tambah policy `SELECT` untuk `anon`.
4. Upload hanya lewat server (service role) setelah authz app; akses baca lewat signed URL TTL pendek.

Path disarankan: `stories/{storyId}/pages/{pageId}/{uuid}.{ext}`.

---

## 4. API keys

**Project Settings → API**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=...   # JANGAN NEXT_PUBLIC_
```

---

## 5. Migrasi & seed (setelah `.env.local` siap)

Dari root repo:

```bash
# Host
pnpm exec prisma migrate deploy
pnpm db:seed

# atau Docker
docker compose up -d --build
docker compose exec web pnpm exec prisma migrate deploy
docker compose exec web pnpm db:seed
```

Seed default: admin dari `SEED_ADMIN_*` + kategori **Bergiliran** dan **Menerima Kemenangan dan Kekalahan**.

---

## 6. Checklist keamanan

- [ ] Bucket `cermin-media` non-public
- [ ] Tidak ada policy anon read/write Storage
- [ ] Service role hanya di server / Docker env
- [ ] Authz utama di app (Better Auth + policy); RLS opsional defense-in-depth
