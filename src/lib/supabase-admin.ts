import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for private Storage (`cermin-media` must be private —
 * see docs/ROADMAP.md §3.4 and prisma/README.md).
 * Lazy init so the app still compiles when Supabase env vars are unset.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Konfigurasi Supabase belum lengkap. Set NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di lingkungan server.",
    );
  }

  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return cached;
}

/** Lazy proxy — same API as createClient result; throws in Indonesian if env missing. */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
