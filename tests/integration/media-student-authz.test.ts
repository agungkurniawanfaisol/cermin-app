import { MediaKind, StoryStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthzError } from "@/server/policies/access";
import { deleteMedia, uploadMedia } from "@/server/actions/media";
import { getSessionForReader } from "@/server/actions/sessions";

const writeAudit = vi.fn();
const revalidatePath = vi.fn();
const requireRole = vi.fn();
const requireSession = vi.fn();
const assertCanAccessStudent = vi.fn();
const assertCanEditStoryContent = vi.fn();
const assertCanReadSession = vi.fn();
const listActiveStudentsForSessionMock = vi.fn();

const pageFindUnique = vi.fn();
const pageFindMany = vi.fn();
const storyFindUnique = vi.fn();
const storyFindMany = vi.fn();
const mediaAssetAggregate = vi.fn();
const mediaAssetCreate = vi.fn();
const mediaAssetFindUnique = vi.fn();
const mediaAssetDelete = vi.fn();
const learningSessionFindUnique = vi.fn();
const sessionObservationFindMany = vi.fn();
const userPreferenceFindUnique = vi.fn();

const storageUpload = vi.fn();
const storageRemove = vi.fn();
const storageCreateSignedUrls = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: (...args: unknown[]) => writeAudit(...args),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => storageUpload(...args),
        remove: (...args: unknown[]) => storageRemove(...args),
        createSignedUrls: (...args: unknown[]) =>
          storageCreateSignedUrls(...args),
      }),
    },
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    storyPage: {
      findUnique: (...args: unknown[]) => pageFindUnique(...args),
      findMany: (...args: unknown[]) => pageFindMany(...args),
    },
    sessionObservation: {
      findMany: (...args: unknown[]) => sessionObservationFindMany(...args),
    },
    story: {
      findUnique: (...args: unknown[]) => storyFindUnique(...args),
      findMany: (...args: unknown[]) => storyFindMany(...args),
    },
    mediaAsset: {
      aggregate: (...args: unknown[]) => mediaAssetAggregate(...args),
      create: (...args: unknown[]) => mediaAssetCreate(...args),
      findUnique: (...args: unknown[]) => mediaAssetFindUnique(...args),
      delete: (...args: unknown[]) => mediaAssetDelete(...args),
    },
    learningSession: {
      findUnique: (...args: unknown[]) => learningSessionFindUnique(...args),
    },
    userPreference: {
      findUnique: (...args: unknown[]) => userPreferenceFindUnique(...args),
    },
  },
}));

vi.mock("@/server/policies/access", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/policies/access")>();
  return {
    ...actual,
    requireRole: (...args: unknown[]) => requireRole(...args),
    requireSession: (...args: unknown[]) => requireSession(...args),
    assertCanAccessStudent: (...args: unknown[]) =>
      assertCanAccessStudent(...args),
    assertCanEditStoryContent: (...args: unknown[]) =>
      assertCanEditStoryContent(...args),
    assertCanReadSession: (...args: unknown[]) =>
      assertCanReadSession(...args),
  };
});

vi.mock("@/server/actions/students", () => ({
  listActiveStudentsForSession: (...args: unknown[]) =>
    listActiveStudentsForSessionMock(...args),
}));

const studentIdA = "11111111-1111-4111-8111-111111111111";
const storyId = "22222222-2222-4222-8222-222222222222";
const pageId = "33333333-3333-4333-8333-333333333333";
const mediaId = "44444444-4444-4444-8444-444444444444";

describe("uploadMedia student personalization authz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageUpload.mockResolvedValue({ error: null });
    storageRemove.mockResolvedValue({ error: null });
    mediaAssetAggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
  });

  it("denies upload when terapis is not assigned to student", async () => {
    requireRole.mockResolvedValue({
      id: "terapis-1",
      role: "TERAPIS",
      status: "ACTIVE",
    });

    pageFindUnique.mockResolvedValue({
      id: pageId,
      storyId,
      story: { id: storyId, status: StoryStatus.DRAFT, createdById: "terapis-1" },
    });

    assertCanAccessStudent.mockRejectedValue(
      new AuthzError("Murid tidak dapat diakses", 403),
    );

    const formData = new FormData();
    formData.set(
      "file",
      new File(["image bytes"], "alya.jpg", { type: "image/jpeg" }),
    );
    formData.set("kind", "IMAGE");
    formData.set("pageId", pageId);
    formData.set("storyId", storyId);
    formData.set("studentId", studentIdA);
    formData.set("altText", "Alya tersenyum");

    const result = await uploadMedia(formData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/murid tidak dapat diakses/i);
    }
    expect(mediaAssetCreate).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it("allows upload for admin and records studentId in audit log", async () => {
    requireRole.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      status: "ACTIVE",
    });

    pageFindUnique.mockResolvedValue({
      id: pageId,
      storyId,
      story: { id: storyId, status: StoryStatus.DRAFT, createdById: "admin-1" },
    });

    assertCanAccessStudent.mockResolvedValue(undefined);

    mediaAssetCreate.mockResolvedValue({
      id: mediaId,
      storyId,
      pageId,
      studentId: studentIdA,
      kind: MediaKind.IMAGE,
      storageKey: `stories/${storyId}/pages/${pageId}/students/${studentIdA}/mock.jpg`,
      byteSize: 100,
      mimeType: "image/jpeg",
    });

    const formData = new FormData();
    formData.set(
      "file",
      new File(["image bytes"], "alya.jpg", { type: "image/jpeg" }),
    );
    formData.set("kind", "IMAGE");
    formData.set("pageId", pageId);
    formData.set("storyId", storyId);
    formData.set("studentId", studentIdA);
    formData.set("altText", "Alya tersenyum");

    const result = await uploadMedia(formData);

    expect(result.ok).toBe(true);
    expect(mediaAssetCreate).toHaveBeenCalledTimes(1);
    expect(mediaAssetCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: studentIdA,
          pageId,
          storyId,
        }),
      }),
    );
    expect(writeAudit).toHaveBeenCalledTimes(1);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "media.upload",
        entityId: mediaId,
        metadata: expect.objectContaining({
          studentId: studentIdA,
        }),
      }),
    );
  });
});

describe("deleteMedia authz and audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageRemove.mockResolvedValue({ error: null });
  });

  it("denies deleteMedia when user lacks edit permission", async () => {
    requireRole.mockResolvedValue({
      id: "terapis-2",
      role: "TERAPIS",
      status: "ACTIVE",
    });

    mediaAssetFindUnique.mockResolvedValue({
      id: mediaId,
      storyId,
      pageId,
      storageBucket: "cermin-media",
      storageKey: "stories/1/pages/1/photo.jpg",
      story: { id: storyId, status: StoryStatus.PUBLISHED, createdById: "terapis-1" },
    });

    assertCanEditStoryContent.mockImplementation(() => {
      throw new AuthzError("Tidak diizinkan mengedit cerita", 403);
    });

    const result = await deleteMedia(mediaId);

    expect(result.ok).toBe(false);
    expect(mediaAssetDelete).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it("deletes from storage and DB with media.delete audit when authorized", async () => {
    requireRole.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      status: "ACTIVE",
    });

    mediaAssetFindUnique.mockResolvedValue({
      id: mediaId,
      storyId,
      pageId,
      studentId: studentIdA,
      kind: MediaKind.IMAGE,
      storageBucket: "cermin-media",
      storageKey: "stories/1/pages/1/students/1/photo.jpg",
      story: { id: storyId, status: StoryStatus.DRAFT, createdById: "admin-1" },
    });

    assertCanEditStoryContent.mockReturnValue(undefined);
    mediaAssetDelete.mockResolvedValue({ id: mediaId });

    const result = await deleteMedia(mediaId);

    expect(result.ok).toBe(true);
    expect(mediaAssetDelete).toHaveBeenCalledWith({ where: { id: mediaId } });
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "media.delete",
        entityId: mediaId,
        metadata: expect.objectContaining({
          storyId,
          studentId: studentIdA,
        }),
      }),
    );
  });
});

describe("getSessionForReader personalized image prioritization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storyFindMany.mockResolvedValue([]);
  });

  it("selects personalized image over shared image for the session student", async () => {
    requireSession.mockResolvedValue({
      id: "terapis-1",
      role: "TERAPIS",
      status: "ACTIVE",
    });

    const sessionId = "55555555-5555-4555-8555-555555555555";
    const sharedImgId = "shared-img-1";
    const personalizedImgId = "pers-img-alya";

    storageCreateSignedUrls.mockResolvedValue({
      data: [
        { signedUrl: "https://example.com/alya.png" },
        { signedUrl: "https://example.com/shared.png" },
      ],
      error: null,
    });

    learningSessionFindUnique.mockResolvedValue({
      id: sessionId,
      studentId: studentIdA,
      storyId: storyId,
      startedAt: new Date(),
      endedAt: null,
      ledByUserId: "terapis-1",
      student: { id: studentIdA, displayName: "Alya" },
      story: {
        id: storyId,
        title: "Giliran Bermain",
        category: { name: "Bergiliran" },
      },
    });

    pageFindMany.mockResolvedValue([
      {
        id: pageId,
        sortOrder: 1,
        bodyText: "Hari ini aku bermain bersama teman.",
        media: [
          {
            id: sharedImgId,
            kind: MediaKind.IMAGE,
            altText: "Foto umum bersama",
            sortOrder: 1,
            studentId: null,
            storageKey: "shared-key",
            storageBucket: "cermin-media",
          },
          {
            id: personalizedImgId,
            kind: MediaKind.IMAGE,
            altText: "Foto Alya",
            sortOrder: 2,
            studentId: studentIdA,
            storageKey: "alya-key",
            storageBucket: "cermin-media",
          },
        ],
      },
    ]);

    sessionObservationFindMany.mockResolvedValue([]);

    userPreferenceFindUnique.mockResolvedValue({
      textSize: "MD",
      audioEnabled: true,
    });

    assertCanReadSession.mockResolvedValue(undefined);
    listActiveStudentsForSessionMock.mockResolvedValue([
      { id: studentIdA, displayName: "Alya" },
    ]);

    const session = await getSessionForReader(sessionId);
    expect(session.story.categoryName).toBe("Bergiliran");
    expect(session.availableStories).toBeDefined();

    expect(session.pages).toHaveLength(1);
    expect(session.pages[0]?.portraitImage?.id).toBe(personalizedImgId);
    expect(session.pages[0]?.portraitImage?.url).toBe(
      "https://example.com/alya.png",
    );
    expect(session.pages[0]?.storyImages.map((m) => m.id)).toEqual([
      sharedImgId,
    ]);
    expect(session.pages[0]?.storyImages[0]?.url).toBe(
      "https://example.com/shared.png",
    );
  });

  it("keeps portrait empty and shows shared below when no personalized image", async () => {
    requireSession.mockResolvedValue({
      id: "terapis-1",
      role: "TERAPIS",
      status: "ACTIVE",
    });

    const sessionId = "55555555-5555-4555-8555-555555555555";
    const sharedImgId = "shared-img-1";
    const otherStudentId = "99999999-9999-4999-8999-999999999999";

    storageCreateSignedUrls.mockResolvedValue({
      data: [{ signedUrl: "https://example.com/shared.png" }],
      error: null,
    });

    learningSessionFindUnique.mockResolvedValue({
      id: sessionId,
      studentId: studentIdA,
      storyId: storyId,
      startedAt: new Date(),
      endedAt: null,
      ledByUserId: "terapis-1",
      student: { id: studentIdA, displayName: "Alya" },
      story: {
        id: storyId,
        title: "Giliran Bermain",
        category: { name: "Bergiliran" },
      },
    });

    pageFindMany.mockResolvedValue([
      {
        id: pageId,
        sortOrder: 1,
        bodyText: "Hari ini aku bermain bersama teman.",
        media: [
          {
            id: sharedImgId,
            kind: MediaKind.IMAGE,
            altText: "Foto umum bersama",
            sortOrder: 1,
            studentId: null,
            storageKey: "shared-key",
            storageBucket: "cermin-media",
          },
          {
            id: "other-student-photo",
            kind: MediaKind.IMAGE,
            altText: "Foto Budi",
            sortOrder: 2,
            studentId: otherStudentId,
            storageKey: "budi-key",
            storageBucket: "cermin-media",
          },
        ],
      },
    ]);

    sessionObservationFindMany.mockResolvedValue([]);

    userPreferenceFindUnique.mockResolvedValue({
      textSize: "MD",
      audioEnabled: true,
    });

    assertCanReadSession.mockResolvedValue(undefined);
    listActiveStudentsForSessionMock.mockResolvedValue([
      { id: studentIdA, displayName: "Alya" },
    ]);

    const session = await getSessionForReader(sessionId);
    expect(session.story.categoryName).toBe("Bergiliran");

    expect(session.pages).toHaveLength(1);
    expect(session.pages[0]?.portraitImage).toBeNull();
    expect(session.pages[0]?.storyImages.map((m) => m.id)).toEqual([
      sharedImgId,
    ]);
    expect(session.pages[0]?.storyImages[0]?.url).toBe(
      "https://example.com/shared.png",
    );
  });

  it("falls back to url: null gracefully if createSignedUrls throws", async () => {
    requireSession.mockResolvedValue({
      id: "terapis-1",
      role: "TERAPIS",
      status: "ACTIVE",
    });

    const sessionId = "55555555-5555-4555-8555-555555555555";
    const sharedImgId = "shared-img-1";

    storageCreateSignedUrls.mockRejectedValue(
      new Error("Supabase network error"),
    );

    learningSessionFindUnique.mockResolvedValue({
      id: sessionId,
      studentId: studentIdA,
      storyId: storyId,
      startedAt: new Date(),
      endedAt: null,
      ledByUserId: "terapis-1",
      student: { id: studentIdA, displayName: "Alya" },
      story: {
        id: storyId,
        title: "Giliran Bermain",
        category: { name: "Bergiliran" },
      },
    });

    pageFindMany.mockResolvedValue([
      {
        id: pageId,
        sortOrder: 1,
        bodyText: "Hari ini aku bermain bersama teman.",
        media: [
          {
            id: sharedImgId,
            kind: MediaKind.IMAGE,
            altText: "Foto umum bersama",
            sortOrder: 1,
            studentId: null,
            storageKey: "shared-key",
            storageBucket: "cermin-media",
          },
        ],
      },
    ]);

    sessionObservationFindMany.mockResolvedValue([]);
    userPreferenceFindUnique.mockResolvedValue({
      textSize: "MD",
      audioEnabled: true,
    });
    assertCanReadSession.mockResolvedValue(undefined);
    listActiveStudentsForSessionMock.mockResolvedValue([
      { id: studentIdA, displayName: "Alya" },
    ]);

    const session = await getSessionForReader(sessionId);
    expect(session.story.categoryName).toBe("Bergiliran");

    expect(session.pages).toHaveLength(1);
    expect(session.pages[0]?.storyImages[0]?.id).toBe(sharedImgId);
    expect(session.pages[0]?.storyImages[0]?.url).toBeNull();
  });
});
