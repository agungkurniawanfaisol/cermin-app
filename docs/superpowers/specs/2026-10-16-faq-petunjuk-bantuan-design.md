# FAQ & Petunjuk penggunaan (Bantuan) — Design

| Field    | Value                  |
| -------- | ---------------------- |
| Date     | 2026-10-16             |
| Status   | Approved (brainstorm)  |
| Route    | `/dashboard/bantuan`   |
| Approach | A — satu halaman + tab |

## 1. Goal

Halaman **Bantuan** di dashboard berisi:

1. **FAQ** — tanya-jawab teks yang Admin kelola (CRUD).
2. **Petunjuk penggunaan** — satu atau lebih dokumen **PDF** yang Admin unggah; semua peran login melihat daftar + preview inline + unduh.

Terapis dan Orang tua **hanya membaca** konten yang dipublikasikan. Tidak ada filter per peran di MVP.

## 2. Decisions (locked)

| Topik        | Keputusan                                                   |
| ------------ | ----------------------------------------------------------- |
| FAQ teks     | Admin CRUD di dashboard                                     |
| Jumlah PDF   | Banyak file (judul + list)                                  |
| Tampil PDF   | Preview inline + tombol unduh                               |
| Audiens      | Semua peran melihat konten yang sama                        |
| Lokasi UI    | `/dashboard/bantuan`, item nav **Bantuan**                  |
| Out of scope | Filter peran, versioning dokumen, non-PDF, rich-text editor |

## 3. Data model

### 3.1 `FaqItem`

| Field                 | Type     | Notes                                                                                                                 |
| --------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| id                    | uuid     | PK                                                                                                                    |
| question              | string   | wajib, max length wajar (Zod)                                                                                         |
| answer                | string   | plain text / markdown sederhana; **bukan** `dangerouslySetInnerHTML` tanpa sanitasi — render plain atau markdown aman |
| sortOrder             | int      | default 0; Admin bisa atur urutan                                                                                     |
| isPublished           | boolean  | default true; non-admin hanya lihat `true`                                                                            |
| createdById           | uuid     | FK User                                                                                                               |
| createdAt / updatedAt | datetime |                                                                                                                       |

Index: `@@index([isPublished, sortOrder])` untuk list publik.

### 3.2 `GuideDocument`

| Field                 | Type     | Notes                                     |
| --------------------- | -------- | ----------------------------------------- |
| id                    | uuid     | PK                                        |
| title                 | string   | label di list (boleh beda dari nama file) |
| sortOrder             | int      |                                           |
| isPublished           | boolean  | default true                              |
| storageBucket         | string   | default `cermin-media`                    |
| storageKey            | string   | path privat, mis. `guides/{uuid}.pdf`     |
| mimeType              | string   | harus `application/pdf`                   |
| byteSize              | int      |                                           |
| originalFileName      | string   | nama file asli untuk unduh                |
| uploadedById          | uuid     | FK User (Admin)                           |
| createdAt / updatedAt | datetime |                                           |

Index: `@@index([isPublished, sortOrder])`.

**Tidak** memakai `MediaAsset` cerita (terikat story/page). Model terpisah agar tidak IDOR lewat relasi cerita.

## 4. Storage & akses media

- Bucket privat yang sama: `cermin-media`.
- Key: `guides/{documentId}.pdf` (`documentId` = id row `GuideDocument`).
- Setelah authz (session aktif + published atau Admin): buat **signed URL** TTL **60–300 detik**.
- Jangan simpan URL publik permanen di HTML.
- Validasi upload: mime `application/pdf`, ekstensi `.pdf`, max **10 MB** (Zod + cek server).

## 5. Authz

| Aksi                                     | Siapa             |
| ---------------------------------------- | ----------------- |
| List / baca FAQ published                | Semua role ACTIVE |
| Create / update / delete / unpublish FAQ | `ADMIN` saja      |
| List / preview / unduh guide published   | Semua role ACTIVE |
| Upload / update metadata / delete guide  | `ADMIN` saja      |
| Lihat unpublished                        | `ADMIN` saja      |

Default tolak. Error generik 403/404. Jangan bocorkan storage key ke klien di luar signed URL.

## 6. UI

### 6.1 Nav

Tambah item **Bantuan** di `getDashboardShellData` / nav (semua peran), ikon `HelpCircle` / `CircleHelp`.

### 6.2 Halaman `/dashboard/bantuan`

- Full width seperti dashboard lain.
- Tab: **FAQ** | **Petunjuk** (URL search `?tab=faq|petunjuk` opsional agar deep-link).
- Calm light tokens CERMIN; mobile-first; touch target ≥ 44px.

**Tab FAQ**

- Accordion (details/summary atau komponen setara) untuk Q&A published.
- Admin: form tambah, edit, hapus, ubah urutan / publish.
- Empty state: “Belum ada FAQ” (+ CTA Admin).

**Tab Petunjuk**

- Desktop: list kiri + panel preview kanan (`iframe` / object PDF dari signed URL) + tombol Unduh.
- Mobile (`< md`): list penuh → pilih item → preview di bawah full-width.
- Admin: upload (judul + file), hapus, ubah judul/urutan.
- Empty state: “Belum ada petunjuk” (+ CTA upload Admin).

## 7. Server actions (ringkas)

- `listFaqsForViewer` / `createFaq` / `updateFaq` / `deleteFaq` (reorder boleh digabung update).
- `listGuidesForViewer` / `uploadGuide` / `updateGuideMeta` / `deleteGuide` / `getGuideSignedUrl`.
- Semua mutasi: Zod + `requireRole("ADMIN")` + `AuditLog` (`faq.create`, `faq.update`, `faq.delete`, `guide.upload`, `guide.update`, `guide.delete`).
- Metadata audit: id entity, title/question singkat — **bukan** isi jawaban penuh panjang / path storage mentah jika bisa dihindari.

## 8. Testing

| Lapisan             | Kasus                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Unit                | Non-admin ditolak create FAQ / upload guide; published filter                                                    |
| Integration         | Signed URL tanpa session → 403; Terapis list published OK; Admin upload menulis audit 1 baris; 403 tidak ubah DB |
| Manual / E2E ringan | Buka tab Petunjuk, preview PDF muncul, unduh jalan                                                               |

## 9. Seed (opsional)

1–2 FAQ contoh published agar halaman tidak kosong di lokal. PDF seed opsional (boleh kosong).

## 10. Success criteria

- Semua peran login bisa buka Bantuan dan baca FAQ + buka PDF yang Admin upload.
- Non-admin tidak bisa mutasi / upload.
- PDF tampil inline di tab Petunjuk dan bisa diunduh.
- Tidak ada URL storage permanen publik; authz di server.
