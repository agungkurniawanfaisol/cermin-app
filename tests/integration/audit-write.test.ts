import { beforeEach, describe, expect, it, vi } from "vitest";

const auditCreate = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    auditLog: {
      create: (...args: unknown[]) => auditCreate(...args),
    },
  },
}));

describe("writeAudit sanitizes metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    auditCreate.mockResolvedValue({ id: "aud-1" });
  });

  it("drops password/token/adminNotes/note before persist", async () => {
    const { writeAudit } = await import("@/lib/audit");

    await writeAudit({
      actorId: "admin-1",
      action: "invite.create",
      entityType: "InviteToken",
      entityId: "inv-1",
      metadata: {
        email: "baru@cermin.local",
        role: "TERAPIS",
        password: "rahasia12",
        token: "raw-token-should-not-store",
        adminNotes: "rahasia",
        note: "observasi",
      },
    });

    expect(auditCreate).toHaveBeenCalledTimes(1);
    const payload = auditCreate.mock.calls[0]![0] as {
      data: { metadata: Record<string, unknown>; action: string };
    };
    expect(payload.data.action).toBe("invite.create");
    expect(payload.data.metadata).toEqual({
      email: "baru@cermin.local",
      role: "TERAPIS",
    });
    expect(payload.data.metadata).not.toHaveProperty("password");
    expect(payload.data.metadata).not.toHaveProperty("token");
    expect(payload.data.metadata).not.toHaveProperty("adminNotes");
    expect(payload.data.metadata).not.toHaveProperty("note");
  });

  it("writes one row for session.start shape", async () => {
    const { writeAudit } = await import("@/lib/audit");

    await writeAudit({
      actorId: "t-a",
      action: "session.start",
      entityType: "LearningSession",
      entityId: "ses-1",
      metadata: {
        studentId: "s1",
        storyId: "st1",
      },
    });

    expect(auditCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate.mock.calls[0]![0]).toMatchObject({
      data: {
        action: "session.start",
        entityType: "LearningSession",
        entityId: "ses-1",
        metadata: { studentId: "s1", storyId: "st1" },
      },
    });
  });
});
