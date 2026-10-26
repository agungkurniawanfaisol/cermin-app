import { StudentStatus, StoryStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { requireSession } from "@/server/policies/access";

export type RecentSessionSummary = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  studentName: string;
  storyTitle: string;
};

export type DashboardSummary = {
  user: SessionUser;
  studentCount: number;
  publishedStoryCount: number;
  sessionsLast7Days: number;
  pendingInvites: number | null;
  recentSessions: RecentSessionSummary[];
  tip: string;
};

async function resolveAllowedStudentIds(
  user: SessionUser,
): Promise<string[] | null> {
  if (user.role === "ADMIN") return null;
  if (user.role === "TERAPIS") {
    const rows = await prisma.therapistAssignment.findMany({
      where: { therapistId: user.id, endedAt: null },
      select: { studentId: true },
    });
    return rows.map((r) => r.studentId);
  }
  if (user.role === "ORANG_TUA") {
    const rows = await prisma.parentLink.findMany({
      where: { parentId: user.id, isActive: true },
      select: { studentId: true },
    });
    return rows.map((r) => r.studentId);
  }
  return [];
}

function buildStudentWhere(allowedStudentIds: string[] | null) {
  if (allowedStudentIds === null) {
    return { status: StudentStatus.ACTIVE };
  }
  return {
    status: StudentStatus.ACTIVE,
    id: { in: allowedStudentIds },
  };
}

function buildSessionWhere(
  allowedStudentIds: string[] | null,
  since?: Date,
) {
  const base = since ? { startedAt: { gte: since } } : {};
  if (allowedStudentIds === null) return base;
  return {
    ...base,
    studentId: { in: allowedStudentIds },
  };
}

function tipForRole(role: SessionUser["role"]): string {
  if (role === "ADMIN") {
    return "Kelola undangan pengguna, pastikan murid punya terapis, lalu mulai sesi belajar pertama.";
  }
  if (role === "TERAPIS") {
    return "Buka murid yang ditugaskan, pilih cerita yang sudah dipublikasikan, lalu jalankan sesi bersama.";
  }
  return "Lihat anak yang terhubung, baca cerita bersama, dan catat observasi rumah setelah sesi.";
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const user = await requireSession();
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const allowedStudentIds = await resolveAllowedStudentIds(user);
  const hasNoAccessibleStudents =
    allowedStudentIds !== null && allowedStudentIds.length === 0;

  const studentWhere = hasNoAccessibleStudents
    ? null
    : buildStudentWhere(allowedStudentIds);
  const sessionWhere = hasNoAccessibleStudents
    ? null
    : buildSessionWhere(allowedStudentIds, since);
  const recentWhere = hasNoAccessibleStudents
    ? null
    : buildSessionWhere(allowedStudentIds);

  const [studentCount, publishedStoryCount, sessionsLast7Days, pendingInvites, recent] =
    await Promise.all([
      studentWhere ? prisma.student.count({ where: studentWhere }) : 0,
      prisma.story.count({ where: { status: StoryStatus.PUBLISHED } }),
      sessionWhere ? prisma.learningSession.count({ where: sessionWhere }) : 0,
      user.role === "ADMIN"
        ? prisma.inviteToken.count({
            where: { usedAt: null, expiresAt: { gt: new Date() } },
          })
        : Promise.resolve(null),
      recentWhere
        ? prisma.learningSession.findMany({
            where: recentWhere,
            orderBy: { startedAt: "desc" },
            take: 3,
            select: {
              id: true,
              startedAt: true,
              endedAt: true,
              student: { select: { displayName: true } },
              story: { select: { title: true } },
            },
          })
        : [],
    ]);
  return {
    user,
    studentCount,
    publishedStoryCount,
    sessionsLast7Days,
    pendingInvites,
    recentSessions: recent.map((s) => ({
      id: s.id,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      studentName: s.student.displayName,
      storyTitle: s.story.title,
    })),
    tip: tipForRole(user.role),
  };
}
