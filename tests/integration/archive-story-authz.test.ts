import { StoryStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthzError } from "@/server/policies/access";

const writeAudit = vi.fn();
const revalidatePath = vi.fn();
const requireRole = vi.fn();
const storyFindUnique = vi.fn();
const storyUpdate = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: (...args: unknown[]) => writeAudit(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    story: {
      findUnique: (...args: unknown[]) => storyFindUnique(...args),
      update: (...args: unknown[]) => storyUpdate(...args),
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

const STORY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REASON = "Konten diganti cerita baru yang lebih sesuai";

describe("archiveStory authz/audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("non-admin → deny, no update, no audit", async () => {
    requireRole.mockRejectedValue(new AuthzError());
    const { archiveStory } = await import("@/server/actions/stories");
    const result = await archiveStory({ storyId: STORY_ID, reason: REASON });

    expect(result.ok).toBe(false);
    expect(storyUpdate).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it("short reason → no update, no audit", async () => {
    requireRole.mockResolvedValue({
      id: "admin-1",
      email: "admin@cermin.local",
      name: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
    });
    const { archiveStory } = await import("@/server/actions/stories");
    const result = await archiveStory({
      storyId: STORY_ID,
      reason: "pendek",
    });

    expect(result.ok).toBe(false);
    expect(storyUpdate).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it("already ARCHIVED → reject, no update, no audit", async () => {
    requireRole.mockResolvedValue({
      id: "admin-1",
      email: "admin@cermin.local",
      name: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
    });
    storyFindUnique.mockResolvedValue({
      id: STORY_ID,
      status: StoryStatus.ARCHIVED,
      title: "Cerita lama",
    });

    const { archiveStory } = await import("@/server/actions/stories");
    const result = await archiveStory({ storyId: STORY_ID, reason: REASON });

    expect(result.ok).toBe(false);
    expect(storyUpdate).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it("admin success → reason + byId + story.archive audit once", async () => {
    const adminId = "11111111-1111-4111-8111-111111111111";
    requireRole.mockResolvedValue({
      id: adminId,
      email: "admin@cermin.local",
      name: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
    });
    storyFindUnique.mockResolvedValue({
      id: STORY_ID,
      status: StoryStatus.PUBLISHED,
      title: "Bergiliran di kelas",
    });
    storyUpdate.mockResolvedValue({
      id: STORY_ID,
      status: StoryStatus.ARCHIVED,
    });

    const { archiveStory } = await import("@/server/actions/stories");
    const result = await archiveStory({ storyId: STORY_ID, reason: REASON });

    expect(result.ok).toBe(true);
    expect(storyUpdate).toHaveBeenCalledWith({
      where: { id: STORY_ID },
      data: expect.objectContaining({
        status: StoryStatus.ARCHIVED,
        archivedReason: REASON,
        archivedById: adminId,
        archivedAt: expect.any(Date),
      }),
      select: { id: true, status: true },
    });
    expect(writeAudit).toHaveBeenCalledTimes(1);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "story.archive",
        entityType: "Story",
        entityId: STORY_ID,
        metadata: expect.objectContaining({
          from: StoryStatus.PUBLISHED,
          to: StoryStatus.ARCHIVED,
          reason: REASON,
        }),
      }),
    );
  });
});
