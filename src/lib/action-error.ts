import { AuthzError } from "@/server/policies/access";

/**
 * Pesan error aman untuk klien.
 * Hanya AuthzError (sudah disanitasi) yang boleh lewat; error Prisma/Storage
 * tidak boleh bocor (ID, constraint, stack).
 */
export function toActionError(error: unknown, fallback: string): string {
  if (error instanceof AuthzError) return error.message;
  return fallback;
}
