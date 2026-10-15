/**
 * Audit metadata harus aman untuk log produksi.
 * Tidak boleh berisi password, token, adminNotes, atau isi observasi.
 * (docs/ACCESS-CONTROL.md §10, rule security-audit-testing)
 */

const SENSITIVE_KEY_EXACT = new Set([
  "password",
  "passwordHash",
  "token",
  "rawToken",
  "tokenHash",
  "inviteToken",
  "adminNotes",
  "note",
  "observation",
  "observationNote",
  "secret",
  "authorization",
  "cookie",
]);

const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|adminnotes|authorization|cookie)/i;

export function isSensitiveAuditKey(key: string): boolean {
  if (SENSITIVE_KEY_EXACT.has(key)) return true;
  return SENSITIVE_KEY_PATTERN.test(key);
}

/**
 * Salin metadata; buang kunci sensitif (rekursif pada objek polos).
 * Array dipotong panjangnya; nilai non-JSON diganti string aman.
 */
export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  return sanitizeValue(metadata) as Record<string, unknown>;
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (isSensitiveAuditKey(key)) continue;
      out[key] = sanitizeValue(child, depth + 1);
    }
    return out;
  }
  return String(value);
}
