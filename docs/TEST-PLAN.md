# Test Plan — CERMIN

| Field        | Value                                      |
| ------------ | ------------------------------------------ |
| Version      | 0.1                                        |
| Date         | 2026-10-15                                 |
| Stack target | Vitest/Jest + Playwright + Testing Library |

## 1. Tujuan

Memastikan otorisasi server-side, alur belajar dipandu, dan akses media aman sebelum rilis MVP.

## 2. Test layers

| Layer       | Tool                  | Fokus                                           |
| ----------- | --------------------- | ----------------------------------------------- |
| Unit        | Vitest                | Policy helpers, Zod schemas, status transitions |
| Integration | Vitest + test DB      | Server Actions CRUD dengan session palsu        |
| Component   | Testing Library       | Dashboard forms, child mode controls            |
| E2E         | Playwright            | Happy path + negative authz                     |
| A11y        | axe / Playwright a11y | Fokus, label, kontras smoke                     |

## 3. Priority cases — Unit

| ID  | Case                                            | Expected        |
| --- | ----------------------------------------------- | --------------- |
| U1  | `assertCanAccessStudent` terapis assigned aktif | allow           |
| U2  | Terapis assignment `ended_at` set               | deny            |
| U3  | Ortu tanpa ParentLink                           | deny            |
| U4  | Admin always student access                     | allow           |
| U5  | Story transition draft→published by Terapis     | deny            |
| U6  | Media IMAGE tanpa alt_text                      | validation fail |
| U7  | Disabled user session                           | deny            |

## 4. Priority cases — Integration

| ID  | Case                                   | Expected              |
| --- | -------------------------------------- | --------------------- |
| I1  | Create student as Admin                | 200 + row             |
| I2  | Create student as Terapis              | 403                   |
| I3  | Assign therapist + unique active pair  | second active fails   |
| I4  | Upload media + storage key persisted   | metadata only in DB   |
| I5  | Signed URL without access              | 403                   |
| I6  | Start session for non-assigned student | 403                   |
| I7  | Observation written with led_by        | row linked to session |

## 5. Priority cases — E2E

| ID  | Case                 | Steps (ringkas)                                                          |
| --- | -------------------- | ------------------------------------------------------------------------ |
| E1  | Admin invite Terapis | invite → set password → login dashboard                                  |
| E2  | Admin murid + assign | create student → assign → terapis sees student                           |
| E3  | Isolation            | terapis B tidak melihat murid A                                          |
| E4  | Cerita publish       | draft pages+media → review → admin publish                               |
| E5  | Child mode session   | open /belajar → next page → play audio click → observasi → end           |
| E6  | No autoplay          | load page with audio → assert `HTMLMediaElement` not playing until click |
| E7  | Ortu linked only     | ortu sees linked child only                                              |

## 6. A11y checks

- Keyboard tab order pada child mode nav.
- Fokus visible pada tombol.
- Image punya alt (atau alt kosong sadar untuk dekoratif — default alt wajib di CMS).
- `prefers-reduced-motion` tidak mematahkan navigasi.
- Tidak ada konten berkedip.

## 7. Test data fixtures

- Users: admin@, terapis-a@, terapis-b@, ortu@
- Students: Anak A (assigned A + linked ortu), Anak B (assigned B)
- Stories: published sample di kategori Bergiliran

## 8. CI

- PR: lint + unit + integration
- Main/preview: + Playwright smoke subset (E1, E3, E5, E6)
- Secrets: test Supabase branch atau local Postgres container

## 9. Exit criteria MVP

- Semua U\* dan I\* kritis hijau
- E1–E7 hijau di CI
- Tidak ada temuan High pada media/IDOR
- Manual checklist child mode calm UI lulus review singkat

## 10. Non-goals (MVP testing)

- Load/performance full suite
- Cross-browser matrix lengkap (Chrome + satu mobile WebKit cukup awal)
- Penetrasi formal eksternal
