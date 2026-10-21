import { StoryStatus } from "@prisma/client";
import { headers } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { auth, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canTransitionStoryStatus } from "@/server/validations/story";

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

/**
 * Deduped per RSC request (layout + page share one call).
 * Prefer role/status from Better Auth session (incl. cookie cache) to avoid
 * an extra Supabase round-trip (~200ms+).
 */
export const requireSession = cache(async (): Promise<SessionUser> => {
  // Next.js Cache Components: auth + any Date.now()/new Date() in session
  // checks must run after a real request (not during static prerender).
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new AuthzError("Silakan masuk", 401);

  const sessionUser = session.user as {
    id: string;
    email: string;
    name: string;
    role?: SessionUser["role"];
    status?: SessionUser["status"];
  };

  if (sessionUser.role && sessionUser.status) {
    if (sessionUser.status !== "ACTIVE") {
      throw new AuthzError("Akun nonaktif", 403);
    }
    return {
      id: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.name,
      role: sessionUser.role,
      status: sessionUser.status,
    };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
    },
  });
  if (user.status !== "ACTIVE") throw new AuthzError("Akun nonaktif", 403);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
  };
});

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

/** Structural transition + role matrix from ACCESS-CONTROL.md */
export function canUserTransitionStoryStatus(
  user: PolicyUser,
  from: StoryStatus,
  to: StoryStatus,
): boolean {
  if (user.status !== "ACTIVE") return false;
  if (!canTransitionStoryStatus(from, to)) return false;

  if (to === StoryStatus.PUBLISHED) {
    return canPublishStory(user);
  }

  if (user.role === "ADMIN") return true;

  if (user.role === "TERAPIS") {
    // Terapis: submit review only (DRAFT → REVIEW)
    return from === StoryStatus.DRAFT && to === StoryStatus.REVIEW;
  }

  return false;
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
          select: { id: true },
        })
      : null,
    role === "ORANG_TUA"
      ? prisma.parentLink.findFirst({
          where: { parentId: userId, studentId, isActive: true },
          select: { id: true },
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

export async function assertCanLeadSession(
  user: PolicyUser,
  studentId: string,
): Promise<void> {
  const ctx = await loadStudentAccessCtx(user.id, user.role, studentId);
  if (!canLeadSession(user, ctx)) throw new AuthzError();
}

export function canAccessGuideDocument(
  user: PolicyUser,
  guide: { isPublished: boolean },
): boolean {
  if (user.status !== "ACTIVE") return false;
  if (user.role === "ADMIN") return true;
  return guide.isPublished;
}

export async function assertCanAccessGuide(
  user: PolicyUser,
  guideId: string,
): Promise<void> {
  const guide = await prisma.guideDocument.findUnique({
    where: { id: guideId },
    select: { isPublished: true },
  });
  if (!guide) throw new AuthzError("Tidak ditemukan", 404);
  if (!canAccessGuideDocument(user, guide)) throw new AuthzError();
}

/** Deduped per RSC request — keyed by id/role/status (bukan object identity). */
const userHasAnyStudentAccessCached = cache(
  async (
    userId: string,
    role: PolicyUser["role"],
    status: PolicyUser["status"],
  ): Promise<boolean> => {
    if (status !== "ACTIVE") return false;
    if (role === "ADMIN") return true;
    if (role === "TERAPIS") {
      const row = await prisma.therapistAssignment.findFirst({
        where: { therapistId: userId, endedAt: null },
        select: { id: true },
      });
      return Boolean(row);
    }
    if (role === "ORANG_TUA") {
      const row = await prisma.parentLink.findFirst({
        where: { parentId: userId, isActive: true },
        select: { id: true },
      });
      return Boolean(row);
    }
    return false;
  },
);

/** True if Admin, or Terapis/Ortu with at least one active student relation. */
export async function userHasAnyStudentAccess(
  user: PolicyUser,
): Promise<boolean> {
  return userHasAnyStudentAccessCached(user.id, user.role, user.status);
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

export type MediaForSignedUrl = {
  id: string;
  storageBucket: string;
  storageKey: string;
  studentId: string | null;
};

/**
 * Satu query: authz media + field storage untuk signed URL.
 * Admin; editor cerita; atau akses murid + cerita PUBLISHED.
 */
export async function loadMediaForSignedUrl(
  user: PolicyUser,
  mediaId: string,
): Promise<MediaForSignedUrl> {
  const media = await prisma.mediaAsset.findUnique({
    where: { id: mediaId },
    select: {
      id: true,
      storageBucket: true,
      storageKey: true,
      studentId: true,
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

  const allow = async (): Promise<boolean> => {
    if (user.role === "ADMIN") return true;
    if (canEditStoryContent(user, story)) return true;
    if (media.studentId) {
      if (story.status !== StoryStatus.PUBLISHED) return false;
      try {
        await assertCanAccessStudent(user, media.studentId);
        return true;
      } catch {
        return false;
      }
    }
    return (
      story.status === StoryStatus.PUBLISHED &&
      (await userHasAnyStudentAccess(user))
    );
  };

  if (!(await allow())) throw new AuthzError();

  return {
    id: media.id,
    storageBucket: media.storageBucket,
    storageKey: media.storageKey,
    studentId: media.studentId,
  };
}

/** @deprecated Prefer loadMediaForSignedUrl agar tidak double-query. */
export async function assertCanAccessMedia(
  user: PolicyUser,
  mediaId: string,
): Promise<void> {
  await loadMediaForSignedUrl(user, mediaId);
}
