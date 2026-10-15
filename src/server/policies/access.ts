import { headers } from "next/headers";
import { auth, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export class AuthzError extends Error {
  constructor(
    message = "Tidak diizinkan",
    public status = 403,
  ) {
    super(message);
    this.name = "AuthzError";
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new AuthzError("Silakan masuk", 401);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });
  if (user.status !== "ACTIVE") throw new AuthzError("Akun nonaktif", 403);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
  };
}
