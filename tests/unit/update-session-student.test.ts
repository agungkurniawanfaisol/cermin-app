import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthzError } from "@/server/policies/access";

const writeAudit = vi.fn();
const revalidatePath = vi.fn();
const requireSession = vi.fn();
const assertCanLeadSession = vi.fn();
const learningSessionFindUnique = vi.fn();
const learningSessionUpdate = vi.fn();
const studentFindFirst = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: (...args: unknown[]) => writeAudit(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    learningSession: {
      findUnique: (...args: unknown[]) => learningSessionFindUnique(...args),
      update: (...args: unknown[]) => learningSessionUpdate(...args),
    },
    student: {
      findFirst: (...args: unknown[]) => studentFindFirst(...args),
    },
  },
}));

vi.mock("@/server/policies/access", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/policies/access")>();
  return {
    ...actual,
    requireSession: (...args: unknown[]) => requireSession(...args),
    assertCanLeadSession: (...args: unknown[]) =>
      assertCanLeadSession(...args),
  };
});

vi.mock("@/server/actions/students", () => ({
  listActiveStudentsForSession: vi.fn(),
}));

import { updateSessionStudent } from "@/server/actions/sessions";

const SESSION_ID = "6ba7b811-9dad-41d1-80b4-00c04fd430c8";
const STUDENT_A = "550e8400-e29b-41d4-a716-446655440000";
const STUDENT_B = "550e8400-e29b-41d4-a716-446655440001";

describe("updateSessionStudent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates student and writes audit when leader changes murid", async () => {
    requireSession.mockResolvedValue({
      id: "leader-1",
      role: "TERAPIS",
      status: "ACTIVE",
    });
    learningSessionFindUnique.mockResolvedValue({
      id: SESSION_ID,
      ledByUserId: "leader-1",
      studentId: STUDENT_A,
      endedAt: null,
    });
    assertCanLeadSession.mockResolvedValue(undefined);
    studentFindFirst.mockResolvedValue({ id: STUDENT_B });
    learningSessionUpdate.mockResolvedValue({});

    const result = await updateSessionStudent({
      sessionId: SESSION_ID,
      studentId: STUDENT_B,
    });

    expect(result.ok).toBe(true);
    expect(learningSessionUpdate).toHaveBeenCalledWith({
      where: { id: SESSION_ID },
      data: { studentId: STUDENT_B },
    });
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "session.student.change",
        entityId: SESSION_ID,
        metadata: {
          fromStudentId: STUDENT_A,
          toStudentId: STUDENT_B,
        },
      }),
    );
  });

  it("rejects when caller cannot lead target student", async () => {
    requireSession.mockResolvedValue({
      id: "leader-1",
      role: "TERAPIS",
      status: "ACTIVE",
    });
    learningSessionFindUnique.mockResolvedValue({
      id: SESSION_ID,
      ledByUserId: "leader-1",
      studentId: STUDENT_A,
      endedAt: null,
    });
    assertCanLeadSession.mockRejectedValue(new AuthzError());

    const result = await updateSessionStudent({
      sessionId: SESSION_ID,
      studentId: STUDENT_B,
    });

    expect(result.ok).toBe(false);
    expect(learningSessionUpdate).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });
});
