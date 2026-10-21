import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthzError } from "@/server/policies/access";

const requireRole = vi.fn();
const auditFindMany = vi.fn();
const auditCount = vi.fn();

vi.mock("@/server/policies/access", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/policies/access")>();
  return {
    ...actual,
    requireRole: (...args: unknown[]) => requireRole(...args),
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    auditLog: {
      findMany: (...args: unknown[]) => auditFindMany(...args),
      count: (...args: unknown[]) => auditCount(...args),
    },
  },
}));

describe("listAuditLogsForAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin", async () => {
    requireRole.mockRejectedValue(new AuthzError("Tidak diizinkan", 403));
    const { listAuditLogsForAdmin } = await import(
      "@/server/actions/audit"
    );
    await expect(listAuditLogsForAdmin()).rejects.toMatchObject({
      name: "AuthzError",
      status: 403,
    });
    expect(auditFindMany).not.toHaveBeenCalled();
  });

  it("returns paginated sanitized rows for admin", async () => {
    requireRole.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      status: "ACTIVE",
    });
    auditCount.mockResolvedValue(1);
    auditFindMany.mockResolvedValue([
      {
        id: "a1",
        action: "story.publish",
        entityType: "Story",
        entityId: "st1",
        metadata: {
          from: "DRAFT",
          to: "PUBLISHED",
          password: "should-strip",
          token: "secret",
        },
        createdAt: new Date("2026-10-01T10:00:00Z"),
        actor: {
          id: "admin-1",
          name: "Admin",
          email: "admin@example.com",
        },
      },
    ]);

    const { listAuditLogsForAdmin } = await import(
      "@/server/actions/audit"
    );
    const result = await listAuditLogsForAdmin({
      entityType: "Story",
      page: "1",
    });

    expect(requireRole).toHaveBeenCalledWith("ADMIN");
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.action).toBe("story.publish");
    expect(result.items[0]?.metadata).toEqual({
      from: "DRAFT",
      to: "PUBLISHED",
    });
    expect(result.items[0]?.metadata).not.toHaveProperty("password");
    expect(auditFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ entityType: "Story" }]),
        }),
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    );
  });
});
