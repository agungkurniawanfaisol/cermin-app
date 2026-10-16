/**
 * Client-side image compression utility.
 * Compresses camera photos (3-10 MB) down to lightweight WebP (~60-150 KB)
 * with max edge 1280px and quality 0.8 (80%), with fallback to JPEG.
 */

export interface CompressImageOptions {
  maxDimension?: number;
  quality?: number;
  format?: "image/webp" | "image/jpeg";
}

function loadImage(file: File): Promise<HTMLImageElement> {
  const { promise, resolve, reject } = Promise.withResolvers<HTMLImageElement>();
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
  return promise;
}

/**
 * Compresses an image file using browser Canvas API.
 * Returns the compressed WebP/JPEG File or the original file if non-image or environment is not browser.
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  if (typeof window === "undefined" || !file || !file.type.startsWith("image/")) {
    return file;
  }

  const maxDimension = options.maxDimension ?? 1280;
  const quality = options.quality ?? 0.8;
  const format = options.format ?? "image/webp";

  try {
    const img = await loadImage(file);
    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;

    if (!naturalWidth || !naturalHeight) {
      return file;
    }

    const longEdge = Math.max(naturalWidth, naturalHeight);
    const scale = longEdge > maxDimension ? maxDimension / longEdge : 1;
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    // Try primary format (default WebP)
    const primaryResolver = Promise.withResolvers<Blob | null>();
    canvas.toBlob((b) => primaryResolver.resolve(b), format, quality);
    let blob = await primaryResolver.promise;

    let targetExt = format === "image/webp" ? "webp" : "jpg";
    let targetMime: string = format;

    // Fallback to JPEG if WebP blob generation fails or is unsupported
    if (!blob && format === "image/webp") {
      const fallbackResolver = Promise.withResolvers<Blob | null>();
      canvas.toBlob((b) => fallbackResolver.resolve(b), "image/jpeg", quality);
      blob = await fallbackResolver.promise;
      targetExt = "jpg";
      targetMime = "image/jpeg";
    }

    if (!blob) return file;

    // If result didn't scale and output is larger than original, preserve original
    if (blob.size >= file.size && scale === 1 && file.type === targetMime) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "foto-cerita";
    return new File([blob], `${baseName}.${targetExt}`, {
      type: targetMime,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
