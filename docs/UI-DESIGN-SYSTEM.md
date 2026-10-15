# UI Design System — CERMIN

| Field    | Value                                |
| -------- | ------------------------------------ |
| Version  | 0.1                                  |
| Date     | 2026-10-15                           |
| Language | Bahasa Indonesia (semua copy produk) |

## 1. Tujuan desain

Antarmuka tenang, low-stimulation, aksesibel, dan ramah anak pada _child mode_, sambil tetap efisien untuk admin/terapis/ortu di dashboard. Preferensi bersifat **dapat dikonfigurasi** — tidak mengasumsikan semua anak autistik punya kebutuhan identik.

## 2. Dua permukaan

| Surface    | Route prefix | Audience             |
| ---------- | ------------ | -------------------- |
| Dashboard  | `/dashboard` | Admin, Terapis, Ortu |
| Child mode | `/belajar`   | Anak + adult pemandu |

Jangan mencampur chrome dashboard (sidebar padat, tabel) ke dalam child mode.

## 3. Prinsip

1. Light theme only — tidak ada dark mode default.
2. Hindari neon, flash, parallax, animasi berlebihan, autoplay audio.
3. Tipografi besar, spasi longgar, kontrol berlabel jelas.
4. Kontras memenuhi target WCAG AA; fokus keyboard terlihat.
5. Tanpa skor hukuman, negative scoring, atau leaderboard kompetitif.
6. Motion hanya jika membantu orientasi (transisi halaman lembut, optional reduce-motion).

## 4. Tipografi

### Child mode

- Primary: `"Comic Sans MS", "Comic Sans", "Chalkboard SE", "Marker Felt", cursive, sans-serif`
- Body size default besar (contoh base 1.25–1.5rem); skala lewat `UserPreference.text_size`.

### Dashboard

- Sans humanis readable (bukan Inter-as-brand-default wajib; pilih satu stack jelas, e.g. `Source Sans 3` atau sistem + fallback yang konsisten).
- Hindari dekorasi berlebih; Comic Sans **tidak** wajib di dashboard admin.

## 5. Warna (arah awal — CSS variables)

```css
:root {
  --bg: #f7f4ef;
  --surface: #ffffff;
  --text: #1f2933;
  --muted: #5c6b73;
  --border: #d9e2ec;
  --accent: #3d7c6b; /* tenang, bukan neon */
  --accent-soft: #e6f2ee;
  --focus: #0b6e4f;
  --danger: #9b2c2c; /* jarang; konfirmasi destruktif */
  --success: #2f6f4e;
}
```

Hindari purple-glow / cream-terracotta AI clichés sebagai identitas utama; palet di atas netral-hijau tenang. Sesuaikan setelah brand final jika ada.

## 6. Spasi & kontrol

- Touch target minimum ~44×44 px.
- Tombol primary: label kata kerja jelas (“Berikutnya”, “Simpan”, “Mulai sesi”).
- Jangan ikon-only tanpa teks di child mode.
- Form fields dengan label terlihat (bukan placeholder-as-label).

## 7. Komponen (shadcn/ui)

Gunakan shadcn untuk dashboard primitives (Button, Input, Dialog, Table, Tabs, Toast).  
Child mode: komponen khusus lebih sederhana — PageFrame, StoryText, MediaFigure, NavControls, AudioPlayButton.

## 8. Child mode layout (viewport pertama)

Isi tipikal satu halaman cerita:

1. Judul cerita (opsional kecil) / progress halaman sederhana non-kompetitif (“Halaman 2 dari 5”).
2. Ilustrasi full-bleed dalam area konten (bukan collage kartu).
3. Teks halaman.
4. Grup CTA: Sebelumnya / Berikutnya (+ Putar audio jika ada).

Tidak ada stats, badges mengambang, atau promo overlay di atas media.

## 9. Preferensi

| Key           | Values      | Effect                                       |
| ------------- | ----------- | -------------------------------------------- |
| text_size     | SM MD LG XL | Font scale child mode (+ optional dashboard) |
| audio_enabled | bool        | Tampilkan kontrol audio; tetap manual play   |

## 10. Motion

- Respect `prefers-reduced-motion`.
- Max 2–3 motion halus: page fade, focus ring, button press.
- No looping decorative animation.

## 11. Copy & tone (ID)

- Ramah, langsung, non-menghukum.
- Error: “Tidak bisa menyimpan. Coba lagi.” — bukan stack trace.
- Empty: arahkan aksi berikutnya.

## 12. Anti-patterns

- Dark theme default
- Autoplay audio/video
- Flashing rewards
- Competitive ranks
- Dense admin chrome inside `/belajar`
- Public CDN URLs for private child media
