# CERMIN — Redesign Mulai Sesi: Kategori → Cerita → Player

**Tanggal:** 2026-10-16  
**Status:** Approved — implementasi dimulai  
**Route utama:** `/dashboard/sesi` → `/belajar/[sessionId]`

## 1. Ringkasan masalah

Form “Mulai sesi” saat ini satu layar dengan tiga `<select>` (murid, kategori, cerita) lalu langsung `startLearningSession` → `/belajar`. Brief produk meminta alur kartu yang dipandu: pilih kategori → pilih cerita → konfirmasi → player child-friendly, dengan layout landscape tanpa scroll dokumen yang tidak perlu.

## 2. Keputusan yang disepakati

| Topik         | Keputusan                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Player        | **Perbaiki `/belajar` yang ada** (bukan route player baru)                                                                       |
| Murid         | Dipilih di dashboard sebelum/bersama masuk wizard; **tetap bisa diganti mid-session** di halaman cerita (`updateSessionStudent`) |
| Lokasi wizard | Entry di `/dashboard/sesi`; wizard **full-screen `/sesi/mulai`** (tanpa sidebar)                                                 |
| Pendekatan    | Client wizard mengganti form select + extend list cerita terbit; session dibuat hanya saat “Mulai Cerita”                        |
| Visual        | Token CERMIN calm (`docs/UI-DESIGN-SYSTEM.md`), bukan palet cream/sage terpisah dari brief                                       |

## 3. Arsitektur

### 3.1 Dashboard `/dashboard/sesi`

1. **Entry:** pilih murid + tombol “Mulai Sesi” (empty state jika tidak ada murid/cerita terbit).
2. **Wizard** (`SessionStartFlow`):
   - Step `category` — kartu kategori.
   - Step `story` — kartu cerita dalam kategori terpilih.
   - Step `preview` — ringkasan + “Kembali” / “Mulai Cerita”.
3. Progress copy: `1. Kategori → 2. Cerita → 3. Sesi` (langkah 3 = redirect ke player setelah start sukses).
4. **Riwayat sesi** tetap di halaman yang sama (di bawah / setelah batal wizard).
5. `startLearningSession({ studentId, storyId })` hanya dari preview; tombol disable saat pending; cegah double submit.

URL sebagai sumber kebenaran untuk Back/refresh, contoh:

- `?step=category&studentId=…`
- `?step=story&studentId=…&categoryId=…`
- `?step=preview&studentId=…&categoryId=…&storyId=…`

Batal/Kembali dari step pertama mengembalikan ke entry (tanpa step) atau clear step params.

### 3.2 Player `/belajar/[sessionId]`

- Reuse authz, signed media, evaluasi, observasi, end session.
- Polish layout viewport: `100dvh` / safe-area; landscape dua kolom (ilustrasi/teks) bila muat; kontrol navigasi selalu reachable; hindari scroll dokumen jika konten muat; jangan clip teks atau kontrol; hormati `prefers-reduced-motion`.
- Dropdown ganti murid di halaman cerita **tetap**.
- Completion tenang → evaluasi existing; jangan klaim tersimpan sebelum server OK; jangan skor kompetitif.

### 3.3 Data (reuse, extend select)

Extend `listPublishedStoriesForSession` / `PublishedStoryOption`:

- `description`
- `pageCount` (via `_count.pages`)
- `coverMediaId` (IMAGE shared pertama per cerita, opsional)
- `categoryDescription` (dari `StoryCategory.description`)

Kategori di UI = agregasi `categoryId` dari cerita `PUBLISHED` saja (hanya kategori yang punya ≥1 cerita). Tidak hardcode “Bergiliran” dll. Tidak ada model/endpoint baru kecuali helper kecil di `sessions.ts` jika perlu.

Authz tidak berubah: `assertCanLeadSession`, hanya `PUBLISHED`, audit `session.start`.

## 4. Komponen (usulan file)

| Komponen                | Tanggung jawab                              |
| ----------------------- | ------------------------------------------- |
| `SessionStartEntry`     | Murid + CTA Mulai Sesi                      |
| `SessionStartFlow`      | Orchestrator step + URL sync + progress     |
| `CategorySelectionStep` | Kartu kategori, loading/empty/error         |
| `StorySelectionStep`    | Kartu cerita filter kategori                |
| `StoryPreview`          | Konfirmasi + Mulai Cerita                   |
| Polish existing         | `session-reader`, `page-media`, CSS belajar |

Nama file menyesuaikan struktur `src/app/dashboard/sesi/` dan `src/components/belajar/`. Jangan duplikasi dashboard chrome di player.

## 5. UI / a11y

- Bahasa Indonesia; calm, uncluttered; touch target ≥44px; fokus keyboard terlihat.
- Kartu: judul + deskripsi singkat; jumlah cerita per kategori jika data andal; cover story jika `coverMediaId` ada (signed URL via pola existing `/api/media/...`).
- Empty: pesan ramah + link ke `/dashboard/cerita` untuk peran yang boleh kelola.
- Tidak autoplay audio; tidak confetti/skor.

## 6. Error & edge

- Loading skeleton wizard; fetch gagal → pesan + retry jika relevan.
- Preview tanpa `storyId` → Mulai disabled.
- Start gagal → error di preview, tidak redirect.
- Cover gagal → placeholder tenang.
- Halaman tanpa gambar/audio di player tidak memecah UI.
- Exit/end: konfirmasi jika sesi masih open (pola existing).

## 7. Out of scope

- Route player baru mengganti `/belajar`.
- Endpoint kategori terpisah hanya untuk sesi (kecuali terbukti perlu setelah inspect query).
- Durasi baca estimasi (tidak ada di model).
- Skor/evaluasi otomatis dari completion cerita.
- Rewrite riwayat sesi atau dashboard shell.

## 8. Acceptance (ringkas)

1. Mulai Sesi → kategori (bukan langsung session).
2. Kategori → hanya cerita kategori itu.
3. Back menjaga `categoryId` / step.
4. Preview benar; Mulai membuat tepat satu session lalu `/belajar`.
5. Player urutan halaman benar; media opsional aman.
6. Ganti murid di `/belajar` tetap jalan.
7. Evaluasi/end existing tetap.
8. Landscape portrait usable; no scroll dokumen berlebih bila muat.
9. Unauthorized tidak start/akses session orang lain.
10. Lint/typecheck/tes relevan hijau untuk perubahan ini.

## 9. Verifikasi setelah implementasi

- `pnpm` lint / `tsc` / tes unit-integration terkait session yang disentuh.
- Manual: viewport 360×800, 844×390, 1366×768.
- Jangan klaim tes lulus tanpa dijalankan.
