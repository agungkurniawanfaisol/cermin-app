import { unstable_cache, revalidateTag } from "next/cache";

/**
 * Robust wrapper around Next.js unstable_cache that delegates to Next.js incremental cache
 * in production and development, and gracefully executes the callback directly in test
 * or non-request environments where Next.js incrementalCache is not mounted.
 */
export function cachedQuery<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  keyParts: string[],
  options?: { tags?: string[]; revalidate?: number | false },
): T {
  if (process.env.NODE_ENV === "test") {
    return fn;
  }
  try {
    const cached = unstable_cache(fn, keyParts, options);
    return ((...args: unknown[]) => {
      try {
        return cached(...args);
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          err.message.includes("incrementalCache missing")
        ) {
          return fn(...args);
        }
        throw err;
      }
    }) as T;
  } catch {
    return fn;
  }
}

/**
 * Safe wrapper around Next.js revalidateTag that catches missing generation store errors
 * outside active Next.js requests (e.g. in test suites, worker scripts, or build phases).
 */
export function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, "max");
  } catch {
    // Graceful no-op when outside Next.js request store
  }
}
