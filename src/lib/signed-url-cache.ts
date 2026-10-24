/**
 * In-memory TTL cache for Supabase Storage signed URLs.
 * Eliminates repetitive Storage API calls across concurrent and sequential reads.
 */

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Minimum remaining TTL (in milliseconds) before an entry is evicted. */
const MIN_REMAINING_TTL_MS = 30_000;


/**
 * Retrieve cached signed URL if valid and remaining TTL is >= 30 seconds.
 */
export function getCachedSignedUrl(bucket: string, key: string): string | null {
  const cacheKey = `${bucket}:${key}`;
  const entry = cache.get(cacheKey);
  if (!entry) return null;

  if (entry.expiresAt - Date.now() <= MIN_REMAINING_TTL_MS) {
    cache.delete(cacheKey);
    return null;
  }

  return entry.url;
}

/**
 * Store a signed URL with a TTL.
 */
export function setCachedSignedUrl(
  bucket: string,
  key: string,
  url: string,
  ttlSeconds: number,
): void {
  const cacheKey = `${bucket}:${key}`;
  const expiresAt = Date.now() + ttlSeconds * 1000;
  cache.set(cacheKey, { url, expiresAt });
}

/**
 * Batch lookup of signed URLs for a list of keys.
 */
export function batchGetCachedSignedUrls(
  bucket: string,
  keys: string[],
): { hits: Map<string, string>; misses: string[] } {
  const hits = new Map<string, string>();
  const misses: string[] = [];

  for (const key of keys) {
    const cached = getCachedSignedUrl(bucket, key);
    if (cached) {
      hits.set(key, cached);
    } else {
      misses.push(key);
    }
  }

  return { hits, misses };
}

/**
 * Batch store signed URLs with a given TTL.
 */
export function batchSetCachedSignedUrls(
  bucket: string,
  entries: Array<{ key: string; url: string }>,
  ttlSeconds: number,
): void {
  for (const { key, url } of entries) {
    setCachedSignedUrl(bucket, key, url, ttlSeconds);
  }
}

/**
 * Clear all cached signed URLs (for testing and invalidation).
 */
export function clearSignedUrlCache(): void {
  cache.clear();
}

/**
 * Return current cache size (for metrics / testing).
 */
export function getSignedUrlCacheSize(): number {
  return cache.size;
}
