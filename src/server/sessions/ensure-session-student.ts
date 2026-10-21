import { StudentStatus } from "@prisma/client";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  AuthzError,
  assertCanLeadSession,
  type PolicyUser,
} from "@/server/policies/access";

type SessionStudentRow = {
  id: string;
  studentId: string;
  ledByUserId: string;
  endedAt: Date | null;
};

function assertCanManageSession(
  user: PolicyUser,
  session: { ledByUserId: string },
): void {
  if (user.role === "ADMIN") return;
  if (session.ledByUserId === user.id) return;
  throw new AuthzError();
}

/**
 * Pastikan LearningSession.studentId cocok dengan murid yang dipilih di UI
 * sebelum catatan/evaluasi disimpan (cegah race ganti nama lokal vs DB).
 */
export async function ensureSessionStudent(
  user: PolicyUser,
  session: SessionStudentRow,
  studentId: string,
): Promise<void> {
  if (session.studentId === studentId) return;

  assertCanManageSession(user, session);
  if (session.endedAt) {
    throw new AuthzError("Sesi sudah berakhir");
  }

  await assertCanLeadSession(user, studentId);

  const student = await prisma.student.findFirst({
    where: { id: studentId, status: StudentStatus.ACTIVE },
    select: { id: true },
  });
  if (!student) {
    throw new AuthzError("Murid tidak ditemukan atau tidak aktif", 404);
  }

  await prisma.learningSession.update({
    where: { id: session.id },
    data: { studentId },
  });

  await writeAudit({
    actorId: user.id,
    action: "session.student.change",
    entityType: "LearningSession",
    entityId: session.id,
    metadata: {
      fromStudentId: session.studentId,
      toStudentId: studentId,
      reason: "sync-on-save",
    },
  });
}
