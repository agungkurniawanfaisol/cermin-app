import { StoryStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mediaFindUnique = vi.fn();
const assignmentFindFirst = vi.fn();
const parentLinkFindFirst = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    mediaAsset: {
      findUnique: (...args: unknown[]) => mediaFindUnique(...args),
    },
    therapistAssignment: {
      findFirst: (...args: unknown[]) => assignmentFindFirst(...args),
    },
    parentLink: {
      findFirst: (...args: unknown[]) => parentLinkFindFirst(...args),
    },
  },
}));

describe("assertCanAccessMedia (I5 / IDOR)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("denies terapis without relation on unpublished story", async () => {
    mediaFindUnique.mockResolvedValue({
      id: "m1",
      story: {
        id: "st1",
        status: StoryStatus.DRAFT,
        createdById: "other",
      },
      page: null,
    });
    assignmentFindFirst.mockResolvedValue(null);

    const { assertCanAccessMedia } = await import(
      "@/server/policies/access"
    );

    await expect(
      assertCanAccessMedia(
        { id: "t-b", role: "TERAPIS", status: "ACTIVE" },
        "m1",
      ),
    ).rejects.toMatchObject({ name: "AuthzError", status: 403 });
  });

  it("allows admin", async () => {
    mediaFindUnique.mockResolvedValue({
      id: "m1",
      story: {
        id: "st1",
        status: StoryStatus.DRAFT,
        createdById: "x",
      },
      page: null,
    });

    const { assertCanAccessMedia } = await import(
      "@/server/policies/access"
    );

    await expect(
      assertCanAccessMedia(
        { id: "admin", role: "ADMIN", status: "ACTIVE" },
        "m1",
      ),
    ).resolves.toBeUndefined();
  });

  it("allows terapis with student access on PUBLISHED story", async () => {
    mediaFindUnique.mockResolvedValue({
      id: "m1",
      story: {
        id: "st1",
        status: StoryStatus.PUBLISHED,
        createdById: "other",
      },
      page: null,
    });
    assignmentFindFirst.mockResolvedValue({ id: "asg1" });

    const { assertCanAccessMedia } = await import(
      "@/server/policies/access"
    );

    await expect(
      assertCanAccessMedia(
        { id: "t-a", role: "TERAPIS", status: "ACTIVE" },
        "m1",
      ),
    ).resolves.toBeUndefined();
  });

  it("404 when media missing (no leak of existence beyond generic)", async () => {
    mediaFindUnique.mockResolvedValue(null);
    const { assertCanAccessMedia } = await import(
      "@/server/policies/access"
    );

    await expect(
      assertCanAccessMedia(
        { id: "admin", role: "ADMIN", status: "ACTIVE" },
        "missing",
      ),
    ).rejects.toMatchObject({
      name: "AuthzError",
      status: 404,
    });
  });

  it("denies terapis without assignment to personalized media student", async () => {
    mediaFindUnique.mockResolvedValue({
      id: "m1",
      studentId: "stu-a",
      story: {
        id: "st1",
        status: StoryStatus.PUBLISHED,
        createdById: "other",
      },
      page: null,
    });
    assignmentFindFirst.mockResolvedValue(null);

    const { assertCanAccessMedia } = await import(
      "@/server/policies/access"
    );

    await expect(
      assertCanAccessMedia(
        { id: "t-b", role: "TERAPIS", status: "ACTIVE" },
        "m1",
      ),
    ).rejects.toMatchObject({ name: "AuthzError", status: 403 });
  });

  it("allows terapis assigned to personalized media student", async () => {
    mediaFindUnique.mockResolvedValue({
      id: "m1",
      studentId: "stu-a",
      story: {
        id: "st1",
        status: StoryStatus.PUBLISHED,
        createdById: "other",
      },
      page: null,
    });
    assignmentFindFirst.mockResolvedValue({ id: "asg1" });

    const { assertCanAccessMedia } = await import(
      "@/server/policies/access"
    );

    await expect(
      assertCanAccessMedia(
        { id: "t-a", role: "TERAPIS", status: "ACTIVE" },
        "m1",
      ),
    ).resolves.toBeUndefined();
  });
});

describe("loadStudentAccessCtx isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("ended assignment does not grant access (U2)", async () => {
    // findFirst with endedAt: null returns null → unassigned
    assignmentFindFirst.mockResolvedValue(null);
    const { loadStudentAccessCtx, canAccessStudent } = await import(
      "@/server/policies/access"
    );

    const ctx = await loadStudentAccessCtx("t-a", "TERAPIS", "student-a");
    expect(ctx.assigned).toBe(false);
    expect(
      canAccessStudent(
        { id: "t-a", role: "TERAPIS", status: "ACTIVE" },
        ctx,
      ),
    ).toBe(false);
    expect(assignmentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ endedAt: null }),
      }),
    );
  });

  it("inactive parent link denies (U3)", async () => {
    parentLinkFindFirst.mockResolvedValue(null);
    const { loadStudentAccessCtx, canAccessStudent } = await import(
      "@/server/policies/access"
    );

    const ctx = await loadStudentAccessCtx("ortu", "ORANG_TUA", "student-a");
    expect(ctx.linked).toBe(false);
    expect(
      canAccessStudent(
        { id: "ortu", role: "ORANG_TUA", status: "ACTIVE" },
        ctx,
      ),
    ).toBe(false);
    expect(parentLinkFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      }),
    );
  });
});
