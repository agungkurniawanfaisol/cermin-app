/**
 * Better Auth / Vercel butuh absolute URL dengan skema (https://…).
 * Env sering diisi `cermin-app.vercel.app` tanpa protokol.
 */
export function normalizeAppUrl(raw: string | undefined | null): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, "");
  }

  return `https://${trimmed.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

export function getAppUrl(): string {
  const url =
    normalizeAppUrl(process.env.BETTER_AUTH_URL) ??
    normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);

  if (!url) {
    throw new Error(
      "BETTER_AUTH_URL atau NEXT_PUBLIC_APP_URL belum di-set (contoh: https://cermin-app-sigma.vercel.app).",
    );
  }
  return url;
}
