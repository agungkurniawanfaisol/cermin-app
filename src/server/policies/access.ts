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

export type PolicyUser = {
  id: string;
  role: "ADMIN" | "TERAPIS" | "ORANG_TUA";
  status: "ACTIVE" | "DISABLED";
};

export type StudentAccessCtx = { assigned: boolean; linked: boolean };

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

export async function requireRole(
  ...roles: PolicyUser["role"][]
): Promise<SessionUser> {
  const user = await requireSession();
  if (!roles.includes(user.role)) throw new AuthzError();
  return user;
}

export function canAccessStudent(
  user: PolicyUser,
  ctx: StudentAccessCtx,
): boolean {
  if (user.status !== "ACTIVE") return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "TERAPIS") return ctx.assigned;
  if (user.role === "ORANG_TUA") return ctx.linked;
  return false;
}

export function canPublishStory(user: PolicyUser): boolean {
  return user.status === "ACTIVE" && user.role === "ADMIN";
}

export function canLeadSession(
  user: PolicyUser,
  ctx: StudentAccessCtx,
): boolean {
  return canAccessStudent(user, ctx);
}

export async function loadStudentAccessCtx(
  userId: string,
  role: PolicyUser["role"],
  studentId: string,
): Promise<StudentAccessCtx> {
  if (role === "ADMIN") return { assigned: true, linked: true };
  const [assignment, link] = await Promise.all([
    role === "TERAPIS"
      ? prisma.therapistAssignment.findFirst({
          where: { therapistId: userId, studentId, endedAt: null },
        })
      : null,
    role === "ORANG_TUA"
      ? prisma.parentLink.findFirst({
          where: { parentId: userId, studentId, isActive: true },
        })
      : null,
  ]);
  return { assigned: Boolean(assignment), linked: Boolean(link) };
}

export async function assertCanAccessStudent(
  user: PolicyUser,
  studentId: string,
): Promise<void> {
  const ctx = await loadStudentAccessCtx(user.id, user.role, studentId);
  if (!canAccessStudent(user, ctx)) throw new AuthzError();
}
