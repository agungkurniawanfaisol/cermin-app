import { UserStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthzError } from "@/server/policies/access";

const writeAudit = vi.fn();
const revalidatePath = vi.fn();
const requireRole = vi.fn();
const userFindUnique = vi.fn();
const userUpdate = vi.fn();
const inviteCreate = vi.fn();
const checkRateLimit = vi.fn((..._args: unknown[]) => ({ ok: true }));
const getRequestIp = vi.fn(async () => "127.0.0.1");

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: (...args: unknown[]) => writeAudit(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (key: string, limit: number, windowMs: number) =>
    checkRateLimit(key, limit, windowMs),
  RATE_LIMIT_MESSAGE: "Terlalu banyak percobaan. Coba lagi nanti.",
}));

vi.mock("@/lib/request-ip", () => ({
  getRequestIp: async () => getRequestIp(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUnique(...args),
      update: (...args: unknown[]) => userUpdate(...args),
    },
    inviteToken: {
      create: (...args: unknown[]) => inviteCreate(...args),
    },
  },
}));

vi.mock("@/server/policies/access", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/policies/access")>();
  return {
    ...actual,
    requireRole: (...args: unknown[]) => requireRole(...args),
  };
});

const REASON = "Tidak lagi bertugas di lembaga ini";

describe("invite + disableUser authz/audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimit.mockReturnValue({ ok: true });
  });

  it("createInvite as non-admin → deny, no invite, no audit", async () => {
    requireRole.mockRejectedValue(new AuthzError());
    const { createInvite } = await import("@/server/actions/invites");

    const result = await createInvite({
      email: "baru@cermin.local",
      role: "TERAPIS",
      name: "Baru",
    });

    expect(result.ok).toBe(false);
    expect(inviteCreate).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it("createInvite as Admin → invite.create audit once", async () => {
    requireRole.mockResolvedValue({
      id: "admin-1",
      email: "admin@cermin.local",
      name: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
    });
    userFindUnique.mockResolvedValue(null);
    inviteCreate.mockResolvedValue({ id: "inv-1" });

    const { createInvite } = await import("@/server/actions/invites");
    const result = await createInvite({
      email: "baru@cermin.local",
      role: "TERAPIS",
      name: "Baru",
    });

    expect(result.ok).toBe(true);
    expect(writeAudit).toHaveBeenCalledTimes(1);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "invite.create",
        entityType: "InviteToken",
        entityId: "inv-1",
        metadata: expect.objectContaining({
          email: "baru@cermin.local",
          role: "TERAPIS",
        }),
      }),
    );
    const meta = writeAudit.mock.calls[0]![0].metadata as Record<
      string,
      unknown
    >;
    expect(meta).not.toHaveProperty("token");
    expect(meta).not.toHaveProperty("tokenHash");
  });

  it("disableUser invalid uuid → no update, no audit", async () => {
    requireRole.mockResolvedValue({
      id: "admin-1",
      email: "admin@cermin.local",
      name: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
    });
    const { disableUser } = await import("@/server/actions/invites");
    const result = await disableUser({
      userId: "bukan-uuid",
      reason: REASON,
    });

    expect(result.ok).toBe(false);
    expect(userUpdate).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it("disableUser short reason → no update, no audit", async () => {
    requireRole.mockResolvedValue({
      id: "admin-1",
      email: "admin@cermin.local",
      name: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
    });
    const { disableUser } = await import("@/server/actions/invites");
    const result = await disableUser({
      userId: "33333333-3333-4333-8333-333333333333",
      reason: "pendek",
    });

    expect(result.ok).toBe(false);
    expect(userUpdate).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it("disableUser self → deny, no update, no audit", async () => {
    const adminId = "11111111-1111-4111-8111-111111111111";
    requireRole.mockResolvedValue({
      id: adminId,
      email: "admin@cermin.local",
      name: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
    });
    const { disableUser } = await import("@/server/actions/invites");
    const result = await disableUser({ userId: adminId, reason: REASON });

    expect(result.ok).toBe(false);
    expect(userUpdate).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it("disableUser as non-admin → deny, no update, no audit", async () => {
    requireRole.mockRejectedValue(new AuthzError());
    const { disableUser } = await import("@/server/actions/invites");
    const result = await disableUser({
      userId: "33333333-3333-4333-8333-333333333333",
      reason: REASON,
    });

    expect(result.ok).toBe(false);
    expect(userUpdate).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it("disableUser success → reason + byId + user.disable audit once", async () => {
    const adminId = "11111111-1111-4111-8111-111111111111";
    const targetId = "33333333-3333-4333-8333-333333333333";
    requireRole.mockResolvedValue({
      id: adminId,
      email: "admin@cermin.local",
      name: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
    });
    userFindUnique.mockResolvedValue({
      id: targetId,
      email: "target@cermin.local",
      role: "TERAPIS",
      status: UserStatus.ACTIVE,
    });
    userUpdate.mockResolvedValue({});

    const { disableUser } = await import("@/server/actions/invites");
    const result = await disableUser({ userId: targetId, reason: REASON });

    expect(result.ok).toBe(true);
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: targetId },
      data: expect.objectContaining({
        status: UserStatus.DISABLED,
        disabledReason: REASON,
        disabledById: adminId,
        disabledAt: expect.any(Date),
      }),
    });
    expect(writeAudit).toHaveBeenCalledTimes(1);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "user.disable",
        entityType: "User",
        entityId: targetId,
        metadata: expect.objectContaining({
          email: "target@cermin.local",
          role: "TERAPIS",
          reason: REASON,
        }),
      }),
    );
  });
});
