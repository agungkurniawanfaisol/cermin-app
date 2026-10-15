# Desain — Foto profil keluarga murid

| Field  | Value                                      |
| ------ | ------------------------------------------ |
| Tanggal | 2026-10-15                                |
| Status | Disetujui dialog (foto opsional, profil saja) |

## Keputusan

- Tiga foto di **profil murid** (bukan akun login Ortu): murid, ayah, ibu.
- Disimpan sebagai kunci Storage privat di model `Student`: `imageKey`, `fatherImageKey`, `motherImageKey`.
- Semua **opsional**. Flag `requirePhotoForSession` tetap hanya untuk foto murid.
- Unggah: JPEG/PNG/WebP maks. 2 MB; authz `assertCanAccessStudent`; signed URL TTL pendek.

## Di luar lingkup

- Memaksa ayah/ibu sebelum sesi.
- Mengganti `User.image` akun Ortu.
