# BRD — CERMIN (CERita MIRip Aku)

| Field      | Value                                                |
| ---------- | ---------------------------------------------------- |
| Version    | 0.1                                                  |
| Status     | Draft for approval                                   |
| Date       | 2026-10-15                                           |
| Product    | CERMIN — social-story learning for autistic children |
| Deployment | Vercel                                               |

## 1. Ringkasan eksekutif

CERMIN adalah aplikasi web untuk mendukung pembelajaran social story bagi anak autistik. Administrator, terapis, dan orang tua mengelola profil murid, konten cerita sosial, media, sesi belajar dipandu, dan observasi.

Anak **tidak memiliki akun login**. Orang dewasa yang berwenang membuka _child mode_ dan memandu sesi bersama anak.

## 2. Masalah bisnis

- Social story sering tersebar di file terpisah tanpa versi, hak akses, atau jejak sesi.
- Penugasan terapis↔murid dan hubungan ortu↔anak jarang tercatat dengan riwayat.
- Observasi belajar sulit dilacak per sesi dan per cerita.
- Antarmuka umum sering overstimulating untuk anak.

## 3. Tujuan

1. Satu sistem lembaga untuk mengelola murid, user, cerita, media, dan sesi.
2. Otorisasi berbasis peran **dan** relasi, ditegakkan di server.
3. Child mode tenang, aksesibel, dapat dikonfigurasi (ukuran teks, audio).
4. Media pribadi (gambar/audio) tidak terekspos URL publik permanen.
5. Deployable ke Vercel dengan Postgres + object storage (Supabase).

## 4. Di luar ruang lingkup (MVP)

- Multi-tenant / banyak lembaga dalam satu deploy.
- Akun login anak.
- Leaderboard, skor hukuman, gamifikasi kompetitif.
- Billing / marketplace konten.
- Aplikasi native iOS/Android (web responsive cukup).
- i18n English (produk Bahasa Indonesia saja).

## 5. Pemangku kepentingan

| Peran                | Kebutuhan utama                                                            |
| -------------------- | -------------------------------------------------------------------------- |
| Administrator        | Kelola user, murid, penugasan, governance konten, audit                    |
| Terapis              | Akses murid assigned, kelola cerita (izin), jalankan sesi, observasi       |
| Orang Tua            | Lihat anak linked, baca cerita dibagikan, observasi rumah (jika diizinkan) |
| Anak (pengguna sesi) | Pengalaman baca tenang; tanpa login                                        |

## 6. Asumsi & keputusan terkunci

| Keputusan  | Pilihan                                                   |
| ---------- | --------------------------------------------------------- |
| Model anak | Guided session — tidak ada login anak                     |
| Auth       | Better Auth (email/password + invite)                     |
| Data       | Supabase Postgres + Storage                               |
| ORM        | Prisma                                                    |
| Arsitektur | Modular monolith (Next.js App Router)                     |
| Bahasa     | Bahasa Indonesia saja                                     |
| Tenancy    | Satu lembaga                                              |
| MVP        | Inti belajar (auth, murid, cerita+media, sesi, observasi) |

## 7. Metrik sukses (awal)

- Admin dapat invite terapis/ortu dan tautkan ke murid dalam &lt; 10 menit.
- Terapis dapat membuat cerita multi-halaman dengan media dan menjalankan 1 sesi child mode end-to-end.
- Tidak ada akses murid/media lintas relasi pada uji otorisasi.
- Child mode: tidak ada autoplay audio; navigasi keyboard berfungsi.

## 8. Risiko bisnis

| Risiko                      | Mitigasi                                                 |
| --------------------------- | -------------------------------------------------------- |
| Kebocoran data anak         | Minimasi PII, private storage, policy server-side, audit |
| Adopsi rendah jika UI rumit | Child mode terpisah; dashboard sederhana; copy ID        |
| Konten tidak terkurasi      | Status cerita + publish hanya Admin (MVP)                |

## 9. Dependensi

- Proyek Supabase (Postgres + Storage)
- Domain/email untuk undangan akun
- Akun Vercel untuk deploy

## 10. Persetujuan

Dokumen ini menunggu persetujuan sebelum implementasi besar dimulai.
