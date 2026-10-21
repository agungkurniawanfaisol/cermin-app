# PRD — CERMIN

| Field   | Value                                                                   |
| ------- | ----------------------------------------------------------------------- |
| Version | 0.1                                                                     |
| Status  | Draft for approval                                                      |
| Date    | 2026-10-15                                                              |
| Related | [BRD](./BRD.md), [ERD](./ERD.md), [ACCESS-CONTROL](./ACCESS-CONTROL.md) |

## 1. Ringkasan produk

CERMIN mendukung pembelajaran social story: kelola murid, user, kategori/cerita/media, sesi belajar dipandu, dan observasi. UI produk sepenuhnya **Bahasa Indonesia**.

## 2. Persona & peran

1. **Administrator** — kelola sistem, user, murid, governance konten.
2. **Terapis** — kerja dengan murid assigned; buat/edit cerita berizin; jalankan sesi.
3. **Orang Tua** — akses anak linked; baca cerita dibagikan; observasi rumah berizin.
4. **Anak** — bukan akun; pengguna visual child mode yang dipandu adult.

## 3. Functional requirements

### FR-A List Murid

| ID    | Requirement                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| FR-A1 | Admin membuat/memperbarui/menonaktifkan profil murid dengan data minim (nama, tanggal lahir opsional, catatan admin terbatas). |
| FR-A2 | Many-to-many terapis↔murid via assignment; `ended_at` mempertahankan history.                                                  |
| FR-A3 | Many-to-many ortu↔murid via parent link.                                                                                       |
| FR-A4 | Terapis hanya melihat murid dengan assignment aktif.                                                                           |
| FR-A5 | Ortu hanya melihat anak dengan link aktif.                                                                                     |
| FR-A6 | Riwayat sesi/observasi dapat dilihat per murid oleh pihak berwenang.                                                           |

### FR-B List User

| ID    | Requirement                                                                            |
| ----- | -------------------------------------------------------------------------------------- |
| FR-B1 | Admin mengelola user: role `ADMIN` \| `TERAPIS` \| `ORANG_TUA`, status aktif/nonaktif. |
| FR-B2 | Invite email dengan token sekali pakai; user set password.                             |
| FR-B3 | Profil user: nama tampilan, email, preferensi (ukuran teks, audio).                    |
| FR-B4 | Permission ditegakkan di server pada setiap mutasi/query.                              |

### FR-C Main Utama (Cerita & Belajar)

| ID    | Requirement                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| FR-C1 | Kategori cerita tidak terbatas; seed awal: _Bergiliran_, _Menerima Kemenangan dan Kekalahan_.                                        |
| FR-C2 | Banyak cerita per kategori: judul, deskripsi, tujuan belajar, status `draft` \| `review` \| `approved` \| `published` \| `archived`. |
| FR-C3 | Banyak halaman berurutan per cerita; teks per halaman.                                                                               |
| FR-C4 | Banyak media (image/audio) terkait halaman/cerita; metadata + `alt_text` untuk gambar.                                               |
| FR-C5 | Maks satu soal MCQ A–D per halaman (opsional): teks + gambar soal/opsi + kunci benar; diedit di tab Halaman (bukan tab Evaluasi terpisah). |
| FR-C6 | Banyak `LearningSession` per pasangan murid+cerita.                                                                                  |
| FR-C7 | Observasi dan respons soal MCQ terpisah per sesi; anak/adult pilih A–D di halaman tanpa skor/confetti.                              |
| FR-C8 | Schema `StoryVersion` untuk history konten published (UI boleh fase 2).                                                              |
| FR-C9 | Child mode: adult memilih murid+cerita published → navigasi halaman → audio manual → observasi.                                      |

### FR-D Platform

| ID    | Requirement                                                                 |
| ----- | --------------------------------------------------------------------------- |
| FR-D1 | UUID untuk entity inti.                                                     |
| FR-D2 | Media file di Supabase Storage private; akses via signed URL setelah authz. |
| FR-D3 | Audit log tindakan sensitif (user, murid, publish, assign).                 |
| FR-D4 | Deploy Vercel.                                                              |

## 4. Non-functional requirements

| ID    | Area        | Requirement                                                                        |
| ----- | ----------- | ---------------------------------------------------------------------------------- |
| NFR-1 | Security    | Auth session server-side; no public permanent media URLs; IDOR prevented           |
| NFR-2 | Privacy     | Collect only necessary student PII; role-scoped access                             |
| NFR-3 | A11y        | WCAG 2.2 AA target for contrast/focus; keyboard operable; no flashing              |
| NFR-4 | UX child    | Low stimulation; Comic Sans MS + fallbacks; large controls; no autoplay            |
| NFR-5 | i18n        | Bahasa Indonesia only                                                              |
| NFR-6 | Reliability | Graceful empty/loading/error states in ID                                          |
| NFR-7 | Testability | Unit (policy), integration (actions), E2E (Playwright)                             |
| NFR-8 | Performance | Story reader pages load usable on typical clinic Wi-Fi; images appropriately sized |

## 5. User flows

### 5.1 Invite terapis/ortu

1. Admin buat invite (email + role).
2. User buka link → set password → login.
3. Jika ortu: Admin tautkan ke murid (atau saat invite).

### 5.2 Kelola murid & assignment

1. Admin buat murid.
2. Admin assign terapis (aktif); unassign set `ended_at`.
3. Admin link ortu.

### 5.3 Buat cerita

1. Admin/Terapis buat cerita di kategori → status `draft`.
2. Tambah halaman berurut + upload media.
3. Ajukan `review` → Admin `approved` → `published`.

### 5.4 Sesi belajar dipandu

1. Terapis/Ortu/Admin pilih murid (akses ok) + cerita published.
2. Masuk `/belajar` child mode; sistem buat `LearningSession`.
3. Navigasi halaman; putar audio jika diinginkan.
4. Catat observasi; akhiri sesi.

## 6. Role-permission matrix (ringkas)

Lihat detail di [ACCESS-CONTROL.md](./ACCESS-CONTROL.md).

| Capability                       | Admin | Terapis              | Ortu                |
| -------------------------------- | ----- | -------------------- | ------------------- |
| Manage users / invites           | ✓     | —                    | —                   |
| CRUD students                    | ✓     | Read assigned        | Read linked         |
| Assign therapists / link parents | ✓     | —\*                  | —                   |
| Category & publish governance    | ✓     | Draft/edit permitted | —                   |
| Run guided session               | ✓     | Assigned             | Linked if allowed   |
| Record observation               | ✓     | Assigned             | Home obs if allowed |
| Audit / settings                 | ✓     | —                    | —                   |

\*Terapis manage assignment hanya jika flag eksplisit diizinkan (default: tidak).

## 7. Validation rules

| Entity      | Rules                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| User        | Email valid unik; role enum; password min policy (panjang + kompleksitas dasar)                      |
| Student     | Nama wajib; DOB jika ada harus ≤ hari ini                                                            |
| Assignment  | Satu pasangan aktif unik (therapist_id + student_id + ended_at null)                                 |
| Story       | Title wajib; status transition terkontrol                                                            |
| StoryPage   | sort_order ≥ 0 unik per story                                                                        |
| Media       | mime allowlist (image/jpeg, png, webp, audio/mpeg, wav, ogg); size limit; alt_text wajib untuk image |
| Session     | student+story harus accessible oleh `led_by_user_id`                                                 |
| Observation | note tidak kosong (trim); max length                                                                 |

## 8. Acceptance criteria (MVP)

- [ ] Login Better Auth untuk 3 role; user nonaktif tidak bisa login.
- [ ] Invite flow membuat user dengan role benar.
- [ ] Admin CRUD murid; assign/unassign terapis menyimpan history.
- [ ] Ortu/terapis tidak bisa baca murid di luar relasi (uji negatif).
- [ ] Cerita multi-halaman + media; child mode tanpa autoplay.
- [ ] Signed media URL gagal tanpa session/izin.
- [ ] LearningSession + observasi tersimpan dan tampil di riwayat murid.
- [ ] UI ID; child mode font Comic Sans MS + fallback; light theme.

## 9. Error / empty / loading states

| State        | Perilaku                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------- |
| Loading      | Skeleton/spinner tenang; tidak berkedip warna neon                                        |
| Empty list   | Copy ID menjelaskan langkah berikutnya (contoh: “Belum ada murid. Tambah murid pertama.”) |
| Unauthorized | Redirect/login atau halaman “Tidak diizinkan” tanpa bocorkan keberadaan resource          |
| Not found    | “Tidak ditemukan” generik                                                                 |
| Validation   | Pesan field-level Bahasa Indonesia                                                        |
| Media gagal  | Pesan “Media tidak dapat dimuat” + retry; jangan putar otomatis                           |
| Network      | Toast/banner ramah; aksi bisa diulang                                                     |

## 10. Fase setelah MVP

- Evaluasi multi-item UI + respons per sesi.
- Version history UI untuk published stories.
- Preferensi child mode lebih lengkap.
- Audit log UI lengkap.
- (Opsional) Akun anak / multi-tenant — **bukan** komitmen saat ini.
