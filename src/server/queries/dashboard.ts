import { StudentStatus, StoryStatus } from "@prisma/client";
import { connection } from "next/server";
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

function studentWhereForRole(user: SessionUser) {
  if (user.role === "ADMIN") {
    return { status: StudentStatus.ACTIVE };
  }
  if (user.role === "TERAPIS") {
    return {
      status: StudentStatus.ACTIVE,
      therapistAssignments: {
        some: { therapistId: user.id, endedAt: null },
      },
    };
  }
  return {
    status: StudentStatus.ACTIVE,
    parentLinks: {
      some: { parentId: user.id, isActive: true },
    },
  };
}

function sessionWhereForRole(user: SessionUser, since: Date) {
  const base = { startedAt: { gte: since } };
  if (user.role === "ADMIN") return base;
  if (user.role === "TERAPIS") {
    return {
      ...base,
      student: {
        therapistAssignments: {
          some: { therapistId: user.id, endedAt: null },
        },
      },
    };
  }
  return {
    ...base,
    student: {
      parentLinks: {
        some: { parentId: user.id, isActive: true },
      },
    },
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
  // After connection() inside requireSession — wall clock is request-safe.
  await connection();
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const studentWhere = studentWhereForRole(user);
  const sessionWhere = sessionWhereForRole(user, since);

  const [studentCount, publishedStoryCount, sessionsLast7Days, pendingInvites, recent] =
    await Promise.all([
      prisma.student.count({ where: studentWhere }),
      prisma.story.count({ where: { status: StoryStatus.PUBLISHED } }),
      prisma.learningSession.count({ where: sessionWhere }),
      user.role === "ADMIN"
        ? prisma.inviteToken.count({
            where: { usedAt: null, expiresAt: { gt: new Date() } },
          })
        : Promise.resolve(null),
      prisma.learningSession.findMany({
        where: sessionWhereForRole(user, new Date(0)),
        orderBy: { startedAt: "desc" },
        take: 3,
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          student: { select: { displayName: true } },
          story: { select: { title: true } },
        },
      }),
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
