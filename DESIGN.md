---
name: CERMIN
description: Social-story learning tenang untuk anak autistik — soft paper, hijau lumut, tipografi Comic.
colors:
  bg: "#f7f4ef"
  surface: "#ffffff"
  text: "#1f2933"
  muted: "#5c6b73"
  border: "#d9e2ec"
  accent: "#3d7c6b"
  accent-soft: "#e6f2ee"
  focus: "#0b6e4f"
  danger: "#9b2c2c"
  success: "#2f6f4e"
  primary-foreground: "#ffffff"
typography:
  display:
    fontFamily: "Comic Sans MS, Comic Sans, Comic Neue, Chalkboard SE, Marker Felt, cursive, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  headline:
    fontFamily: "Comic Sans MS, Comic Sans, Comic Neue, Chalkboard SE, Marker Felt, cursive, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Comic Sans MS, Comic Sans, Comic Neue, Chalkboard SE, Marker Felt, cursive, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Comic Sans MS, Comic Sans, Comic Neue, Chalkboard SE, Marker Felt, cursive, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  body-child:
    fontFamily: "Comic Sans MS, Comic Sans, Comic Neue, Chalkboard SE, Marker Felt, cursive, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Comic Sans MS, Comic Sans, Comic Neue, Chalkboard SE, Marker Felt, cursive, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  "2xl": "1.125rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  "2xl": "3rem"
  touch: "2.75rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 1rem"
    height: "{spacing.touch}"
  button-primary-hover:
    backgroundColor: "{colors.focus}"
    textColor: "{colors.primary-foreground}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 1rem"
    height: "{spacing.touch}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.75rem"
    height: "{spacing.touch}"
  card-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  nav-item-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 0.75rem"
---

# Design System: CERMIN

## Overview

**Creative North Star: "Ruang Baca Tenang"**

CERMIN terasa seperti ruang baca klinik/rumah yang soft: kertas hangat, hijau lumut sebagai satu suara aksen, tipografi Comic yang familiar dan lega. Dua permukaan berbagi dunia visual yang sama tetapi berbeda densitas — dasbor dewasa untuk tugas, child mode untuk panduan cerita tanpa chrome admin.

Sistem ini tenang, lega, dan ramah. Depth datang dari lapisan nada (bg → surface → border) bukan glow. Motion jarang dan hormat `prefers-reduced-motion`. Bahasa produk hanya Indonesia.

**Key Characteristics:**

- Light theme only; soft paper `#f7f4ef` sebagai canvas
- Satu aksen **Hijau Lumut Tenang** `#3d7c6b` (≤~10% layar)
- Tipografi Comic stack di seluruh app; child mode lebih besar
- Mobile-first; touch target ~44px; tanpa overflow-x
- Dua permukaan: `/dashboard` vs `/belajar` — jangan dicampur chrome-nya

## Colors

Palet netral-hijau tenang untuk low stimulation; danger/success jarang dan semantik.

### Primary

- **Hijau Lumut Tenang** (`#3d7c6b`): CTA primer, tautan merek, status aktif, sidebar highlight.
- **Hijau Fokus** (`#0b6e4f`): fokus keyboard / hover primer yang lebih dalam.
- **Hijau Soft** (`#e6f2ee`): chip, nav aktif, permukaan sekunder lembut.

### Neutral

- **Kertas Hangat** (`#f7f4ef`): latar halaman.
- **Surface Putih** (`#ffffff`): kartu, form, panel.
- **Tinta Batu** (`#1f2933`): teks utama.
- **Abu Tenang** (`#5c6b73`): teks sekunder / meta.
- **Garis Kabut** (`#d9e2ec`): border, input stroke.

### Semantic

- **Bahaya** (`#9b2c2c`): aksi destruktif / error saja.
- **Sukses** (`#2f6f4e`): konfirmasi tenang, bukan reward flashy.

### Named Rules

**The One Voice Rule.** Aksen hijau dipakai hemat (CTA, fokus, highlight). Jangan saturasi neon atau purple-glow sebagai identitas.

**The Light-Only Rule.** Tidak ada dark mode default produk. Kelas `.dark` shadcn bukan arah brand CERMIN.

## Typography

**Display / Body / Label Font:** stack Comic — `"Comic Sans MS", "Comic Sans", "Comic Neue", "Chalkboard SE", "Marker Felt", cursive, sans-serif`  
Comic Neue (OFL) di-host lokal di `public/fonts/`.

**Character:** hangat, anak-akrab, tanpa heirarki tipografi “startup SaaS”. Satu keluarga huruf di semua permukaan menjaga prediktabilitas sensorik.

### Hierarchy

- **Display** (600, ~1.75–2.25rem): judul landing / hero dasbor.
- **Headline** (600, 1.5rem): judul halaman dasbor / cerita.
- **Title** (600, 1.125rem): section heading.
- **Body** (400, 1rem / 1.55): salinan dasbor & form.
- **Body child** (400, ~1.35rem+): teks halaman cerita; skala SM–XL lewat preferensi.
- **Label** (500, 0.875rem): label form, meta, chip peran.

### Named Rules

**The Comic Everywhere Rule.** Jangan sisipkan Inter/Roboto/system-ui sebagai voice utama. Fallback hanya dalam stack Comic.

**The Child Scale Rule.** Di `/belajar`, teks cerita lebih besar dari dasbor; hormati `UserPreference.textSize`.

## Layout

Mobile-first. Padding halaman tipikal `px-4` → `sm:px-6` / `md:px-8` / `lg:px-10`. **Konten dasbor dan form memakai lebar penuh area konten** (`w-full`), bukan kolom sempit `max-w-md`/`max-w-2xl`. Landing memakai `max-w-7xl`. Child mode `/belajar` full-bleed dalam padding aman. Grid daftar: 1 kolom → `sm:2` → `lg:3|4`.

**Responsive:** tinjau ~375px dan ~1280px. Tidak ada `overflow-x` pada konten normal. Sidebar dasbor collapsible di desktop; drawer penuh di mobile.

**Spacing rhythm:** kelompok terkait rapat (`gap-2`–`gap-3`); section terpisah `gap-6`–`gap-8`. Touch target minimum ~44×44 (`min-h-11`).

### Named Rules

**The Two-Surface Rule.** Jangan taruh sidebar/tabel padat di dalam child mode. Progress halaman non-kompetitif (“Halaman 2 dari 5”) saja.

## Elevation & Depth

Flat-by-default dengan lapisan tonal. Shadow jarang — soft ambient pada kartu landing/form (`shadow` sangat lembut), bukan glow berwarna.

### Shadow Vocabulary

- **Ambient soft** (`0 16px 40px -28px` mix aksen / netral): kartu login/landing yang perlu sedikit lift.
- **Rest:** tanpa shadow; bedakan lewat border `#d9e2ec` + surface putih di atas bg kertas.

### Named Rules

**The Flat-By-Default Rule.** Shadow hanya untuk lift ringan kartu pemasaran/form. Tidak ada halo neon atau offset keras.

## Shapes

Sudut lembut konsisten: radius dasar `0.625rem` (≈10px); kartu `rounded-xl` / `rounded-2xl`; kontrol child mode lebih bulat (`rounded-2xl`) untuk target sentuh besar. Border 1px `Garis Kabut`. Avatar lingkaran penuh.

## Components

Karakter: **tenang dan tertahan** — jelas, label kata kerja, tanpa dekorasi berlebih.

### Buttons

- **Shape:** `rounded-lg` (~10px); aksi utama produk `min-h-11`.
- **Primary:** latar Hijau Lumut, teks putih; hover Hijau Fokus.
- **Outline / Ghost:** border kabut atau hover soft; untuk aksi sekunder.
- **Destructive:** merah semantik, jarang.
- **Focus:** ring fokus `#0b6e4f` terlihat.

### Cards / Containers

- Surface putih, border kabut, radius xl; padding `1–1.25rem`.
- Dipakai untuk form, kartu foto keluarga, ringkasan dasbor — bukan sebagai struktur hero landasan.

### Inputs / Fields

- Tinggi ~44px (`h-11`), label terlihat di atas (bukan placeholder-as-label).
- Focus: ring/border fokus hijau.

### Navigation

- Dasbor: sidebar/desktop + menu mobile; item aktif = soft hijau.
- Landing/login: tautan merek CERMIN + CTA “Masuk”.

### Child mode controls

- Tombol navigasi halaman besar (`min-h-16`), audio manual saja (tidak autoplay).
- Observasi di bawah reader; chrome minimal.

### Named Rules

**The Labeled Action Rule.** Di child mode, hindari ikon-only tanpa teks. Tombol menyebut aksi (“Berikutnya”, “Putar suara”).

## Do's and Don'ts

### Do:

- **Do** pakai token CERMIN (`--bg`, `--cermin-accent`, dll.) konsisten di permukaan baru.
- **Do** pastikan mobile + desktop: touch ~44px, tanpa scroll horizontal.
- **Do** hormati `prefers-reduced-motion`; audio hanya setelah klik.
- **Do** empty/error state dalam Bahasa Indonesia yang mengarahkan aksi berikutnya.

### Don't:

- **Don't** dark mode default, neon, purple-glow, gradient teks, atau confetti/skor kompetitif.
- **Don't** autoplay audio/video di child mode.
- **Don't** campur chrome dasbor (sidebar padat, tabel) ke `/belajar`.
- **Don't** URL publik permanen untuk media privat anak.
- **Don't** ganti tipografi utama ke Inter/Roboto/system display.
