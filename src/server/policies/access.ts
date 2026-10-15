import { StoryStatus } from "@prisma/client";
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

export type StoryEditTarget = {
  status: StoryStatus;
  createdById: string;
};

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

/** Admin (non-archived) or Terapis on own DRAFT. */
export function assertCanEditStoryContent(
  user: PolicyUser,
  story: StoryEditTarget,
): void {
  if (user.role === "ADMIN") {
    if (story.status === StoryStatus.ARCHIVED) {
      throw new AuthzError("Cerita terarsip tidak dapat diedit");
    }
    return;
  }
  if (user.role === "TERAPIS") {
    if (story.status !== StoryStatus.DRAFT) {
      throw new AuthzError("Terapis hanya dapat mengedit draf");
    }
    if (story.createdById !== user.id) {
      throw new AuthzError("Anda hanya dapat mengedit cerita sendiri");
    }
    return;
  }
  throw new AuthzError();
}

export function canEditStoryContent(
  user: PolicyUser,
  story: StoryEditTarget,
): boolean {
  try {
    assertCanEditStoryContent(user, story);
    return true;
  } catch {
    return false;
  }
}

/**
 * MVP media access: Admin; story editor; or authenticated Admin/Terapis/Ortu
 * when story is PUBLISHED (learning content).
 */
export async function assertCanAccessMedia(
  user: PolicyUser,
  mediaId: string,
): Promise<void> {
  const media = await prisma.mediaAsset.findUnique({
    where: { id: mediaId },
    include: {
      story: { select: { id: true, status: true, createdById: true } },
      page: {
        select: {
          story: { select: { id: true, status: true, createdById: true } },
        },
      },
    },
  });

  if (!media) throw new AuthzError("Media tidak ditemukan", 404);

  const story = media.story ?? media.page?.story ?? null;
  if (!story) throw new AuthzError("Media tidak terkait cerita", 404);

  if (user.role === "ADMIN") return;

  if (canEditStoryContent(user, story)) return;

  if (
    story.status === StoryStatus.PUBLISHED &&
    (user.role === "TERAPIS" || user.role === "ORANG_TUA")
  ) {
    return;
  }

  throw new AuthzError();
}
