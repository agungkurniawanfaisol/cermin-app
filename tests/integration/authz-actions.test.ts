import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthzError } from "@/server/policies/access";

const writeAudit = vi.fn();
const revalidatePath = vi.fn();
const requireRole = vi.fn();
const requireSession = vi.fn();
const assertCanLeadSession = vi.fn();

const studentCreate = vi.fn();
const parentLinkCreate = vi.fn();
const userFindUnique = vi.fn();
const learningSessionCreate = vi.fn();
const studentFindUnique = vi.fn();
const storyFindUnique = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: (...args: unknown[]) => writeAudit(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => userFindUnique(...args) },
    student: {
      create: (...args: unknown[]) => studentCreate(...args),
      findUnique: (...args: unknown[]) => studentFindUnique(...args),
    },
    parentLink: {
      create: (...args: unknown[]) => parentLinkCreate(...args),
    },
    learningSession: {
      create: (...args: unknown[]) => learningSessionCreate(...args),
    },
    story: {
      findUnique: (...args: unknown[]) => storyFindUnique(...args),
    },
    $transaction: async (
      fn: (tx: {
        student: { create: typeof studentCreate };
        parentLink: { create: typeof parentLinkCreate };
      }) => Promise<unknown>,
    ) =>
      fn({
        student: { create: studentCreate },
        parentLink: { create: parentLinkCreate },
      }),
  },
}));

vi.mock("@/server/policies/access", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/policies/access")>();
  return {
    ...actual,
    requireRole: (...args: unknown[]) => requireRole(...args),
    requireSession: (...args: unknown[]) => requireSession(...args),
    assertCanLeadSession: (...args: unknown[]) => assertCanLeadSession(...args),
  };
});

describe("authz Server Actions (I2, I6 + audit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("I2: createStudent as Terapis → deny, no row, no audit", async () => {
    requireRole.mockRejectedValue(new AuthzError());
    const { createStudent } = await import("@/server/actions/students");

    const result = await createStudent({
      displayName: "Alya",
    } as Parameters<typeof createStudent>[0]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Tidak diizinkan");
    expect(studentCreate).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it("I1: createStudent as Admin → row + student.create audit", async () => {
    requireRole.mockResolvedValue({
      id: "admin-1",
      email: "admin@cermin.local",
      name: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
    });
    studentCreate.mockResolvedValue({
      id: "student-1",
      displayName: "Alya",
    });

    const { createStudent } = await import("@/server/actions/students");
    const result = await createStudent({
      displayName: "Alya",
    } as Parameters<typeof createStudent>[0]);

    expect(result).toEqual({ ok: true, data: { id: "student-1" } });
    expect(studentCreate).toHaveBeenCalledTimes(1);
    expect(writeAudit).toHaveBeenCalledTimes(1);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "student.create",
        entityType: "Student",
        entityId: "student-1",
      }),
    );
  });

  it("I6: startLearningSession non-assigned → deny, no session, no audit", async () => {
    requireSession.mockResolvedValue({
      id: "terapis-b",
      email: "b@cermin.local",
      name: "B",
      role: "TERAPIS",
      status: "ACTIVE",
    });
    assertCanLeadSession.mockRejectedValue(new AuthzError());

    const { startLearningSession } = await import(
      "@/server/actions/sessions"
    );
    const result = await startLearningSession({
      studentId: "11111111-1111-4111-8111-111111111111",
      storyId: "22222222-2222-4222-8222-222222222222",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Tidak diizinkan");
    expect(learningSessionCreate).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });
});
