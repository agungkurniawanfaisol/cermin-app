import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthzError } from "@/server/policies/access";

const writeAudit = vi.fn();
const assertCanLeadSession = vi.fn();
const learningSessionUpdate = vi.fn();
const studentFindFirst = vi.fn();

vi.mock("@/lib/audit", () => ({
  writeAudit: (...args: unknown[]) => writeAudit(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    learningSession: {
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
    assertCanLeadSession: (...args: unknown[]) =>
      assertCanLeadSession(...args),
  };
});

import { ensureSessionStudent } from "@/server/sessions/ensure-session-student";

const SESSION_ID = "6ba7b811-9dad-41d1-80b4-00c04fd430c8";
const STUDENT_A = "550e8400-e29b-41d4-a716-446655440000";
const STUDENT_B = "550e8400-e29b-41d4-a716-446655440001";

describe("ensureSessionStudent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no-ops when session already has selected student", async () => {
    await ensureSessionStudent(
      { id: "leader-1", role: "TERAPIS", status: "ACTIVE" },
      {
        id: SESSION_ID,
        ledByUserId: "leader-1",
        studentId: STUDENT_A,
        endedAt: null,
      },
      STUDENT_A,
    );

    expect(learningSessionUpdate).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it("updates session student when UI selection differs", async () => {
    assertCanLeadSession.mockResolvedValue(undefined);
    studentFindFirst.mockResolvedValue({ id: STUDENT_B });
    learningSessionUpdate.mockResolvedValue({});

    await ensureSessionStudent(
      { id: "leader-1", role: "TERAPIS", status: "ACTIVE" },
      {
        id: SESSION_ID,
        ledByUserId: "leader-1",
        studentId: STUDENT_A,
        endedAt: null,
      },
      STUDENT_B,
    );

    expect(learningSessionUpdate).toHaveBeenCalledWith({
      where: { id: SESSION_ID },
      data: { studentId: STUDENT_B },
    });
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "session.student.change",
        metadata: expect.objectContaining({
          fromStudentId: STUDENT_A,
          toStudentId: STUDENT_B,
          reason: "sync-on-save",
        }),
      }),
    );
  });

  it("rejects when caller cannot manage session", async () => {
    await expect(
      ensureSessionStudent(
        { id: "other", role: "TERAPIS", status: "ACTIVE" },
        {
          id: SESSION_ID,
          ledByUserId: "leader-1",
          studentId: STUDENT_A,
          endedAt: null,
        },
        STUDENT_B,
      ),
    ).rejects.toBeInstanceOf(AuthzError);

    expect(learningSessionUpdate).not.toHaveBeenCalled();
  });
});
