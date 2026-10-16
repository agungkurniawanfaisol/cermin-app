/**
 * Kompres gambar di browser sebelum upload (max long edge + JPEG quality).
 * Tidak dipakai di server — hanya FormData klien.
 */

const MAX_LONG_EDGE = 1280;
const JPEG_QUALITY = 0.75;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal membaca gambar"));
    };
    img.src = url;
  });
}

/**
 * Mengecilkan sisi panjang ke MAX_LONG_EDGE dan encode JPEG ~0.75.
 * Jika bukan image/* atau gagal, kembalikan file asli.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const img = await loadImage(file);
    const long = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = long > MAX_LONG_EDGE ? MAX_LONG_EDGE / long : 1;
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
    });
    if (!blob) return file;

    // Jangan ganti jika hasil lebih besar (mis. PNG kecil).
    if (blob.size >= file.size && scale === 1) return file;

    const base =
      file.name.replace(/\.[^.]+$/, "") || "gambar";
    return new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
