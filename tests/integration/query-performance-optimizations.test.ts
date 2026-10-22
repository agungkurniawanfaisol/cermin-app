import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadGuideForDownload } from "@/server/policies/access";
import { getStudentDetail } from "@/server/actions/students";
import { getStoryEditorShell } from "@/server/actions/stories";

const requireSession = vi.fn();
const assertCanAccessStudent = vi.fn();
const studentFindUnique = vi.fn();
const guideDocumentFindUnique = vi.fn();
const storyFindUnique = vi.fn();
const storyQueryRaw = vi.fn();
const storyPageCount = vi.fn();

vi.mock("@/server/policies/access", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/policies/access")>();
  return {
    ...actual,
    requireSession: (...args: unknown[]) => requireSession(...args),
    assertCanAccessStudent: (...args: unknown[]) =>
      assertCanAccessStudent(...args),
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    student: {
      findUnique: (...args: unknown[]) => studentFindUnique(...args),
    },
    guideDocument: {
      findUnique: (...args: unknown[]) => guideDocumentFindUnique(...args),
    },
    story: {
      findUnique: (...args: unknown[]) => storyFindUnique(...args),
    },
    $queryRaw: (...args: unknown[]) => storyQueryRaw(...args),
    storyPage: {
      count: (...args: unknown[]) => storyPageCount(...args),
    },
  },
}));

const VALID_STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const VALID_GUIDE_ID = "22222222-2222-4222-8222-222222222222";
const VALID_STORY_ID = "33333333-3333-4333-8333-333333333333";
const VALID_CATEGORY_ID = "44444444-4444-4444-8444-444444444444";

describe("Query performance & security optimizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStudentDetail: role-conditional field selection", () => {
    it("non-admin: selects adminNotes=false and allergies=false, omitting confidential fields", async () => {
      requireSession.mockResolvedValue({
        id: "therapist-1",
        role: "TERAPIS",
        status: "ACTIVE",
      });
      assertCanAccessStudent.mockResolvedValue(undefined);
      studentFindUnique.mockResolvedValue({
        id: VALID_STUDENT_ID,
        displayName: "Budi",
        fullName: "Budi Pratama",
        therapistAssignments: [],
        parentLinks: [],
      });

      const result = await getStudentDetail(VALID_STUDENT_ID);

      expect(studentFindUnique).toHaveBeenCalledTimes(1);
      const callArgs = studentFindUnique.mock.calls[0]?.[0];
      expect(callArgs.select.adminNotes).toBe(false);
      expect(callArgs.select.allergies).toBe(false);
      expect(result.displayName).toBe("Budi");
      expect(result).not.toHaveProperty("adminNotes");
      expect(result).not.toHaveProperty("allergies");
    });

    it("admin: selects adminNotes=true and allergies=true over wire", async () => {
      requireSession.mockResolvedValue({
        id: "admin-1",
        role: "ADMIN",
        status: "ACTIVE",
      });
      studentFindUnique.mockResolvedValue({
        id: VALID_STUDENT_ID,
        displayName: "Budi",
        fullName: "Budi Pratama",
        adminNotes: "Catatan rahasia admin",
        allergies: "Alergi debu",
        therapistAssignments: [],
        parentLinks: [],
      });

      const result = await getStudentDetail(VALID_STUDENT_ID);

      expect(studentFindUnique).toHaveBeenCalledTimes(1);
      const callArgs = studentFindUnique.mock.calls[0]?.[0];
      expect(callArgs.select.adminNotes).toBe(true);
      expect(callArgs.select.allergies).toBe(true);
      expect(result.adminNotes).toBe("Catatan rahasia admin");
      expect(result.allergies).toBe("Alergi debu");
    });
  });

  describe("loadGuideForDownload: single-query authorization & storage retrieval", () => {
    it("allows published guide for active user in one query", async () => {
      guideDocumentFindUnique.mockResolvedValue({
        id: VALID_GUIDE_ID,
        isPublished: true,
        storageBucket: "cermin-media",
        storageKey: "guides/manual.pdf",
      });

      const result = await loadGuideForDownload(
        { id: "parent-1", role: "ORANG_TUA", status: "ACTIVE" },
        VALID_GUIDE_ID,
      );

      expect(guideDocumentFindUnique).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        id: VALID_GUIDE_ID,
        storageBucket: "cermin-media",
        storageKey: "guides/manual.pdf",
      });
    });

    it("throws 403 for non-admin requesting unpublished guide", async () => {
      guideDocumentFindUnique.mockResolvedValue({
        id: VALID_GUIDE_ID,
        isPublished: false,
        storageBucket: "cermin-media",
        storageKey: "guides/draft.pdf",
      });

      await expect(
        loadGuideForDownload(
          { id: "parent-1", role: "ORANG_TUA", status: "ACTIVE" },
          VALID_GUIDE_ID,
        ),
      ).rejects.toMatchObject({
        name: "AuthzError",
        status: 403,
      });
      expect(guideDocumentFindUnique).toHaveBeenCalledTimes(1);
    });

    it("throws 404 when guide document does not exist", async () => {
      guideDocumentFindUnique.mockResolvedValue(null);

      await expect(
        loadGuideForDownload(
          { id: "admin-1", role: "ADMIN", status: "ACTIVE" },
          VALID_GUIDE_ID,
        ),
      ).rejects.toMatchObject({
        name: "AuthzError",
        status: 404,
      });
    });
  });

  describe("getStoryEditorShell: parallel execution of story metadata and page counts", () => {
    it("returns correct shell metrics across concurrent queries", async () => {
      requireSession.mockResolvedValue({
        id: "therapist-1",
        role: "TERAPIS",
        status: "ACTIVE",
      });
      storyFindUnique.mockResolvedValue({
        id: VALID_STORY_ID,
        title: "Pergi ke Dokter Gigi",
        description: "Panduan kontrol gigi anak",
        learningObjectives: "Belajar duduk tenang",
        categoryId: VALID_CATEGORY_ID,
        status: "DRAFT",
        createdById: "therapist-1",
        updatedAt: new Date("2026-10-22T08:00:00Z"),
        archivedReason: null,
        category: {
          id: VALID_CATEGORY_ID,
          name: "Kesehatan",
        },
        createdBy: {
          id: "therapist-1",
          name: "Terapis A",
          email: "terapis@example.com",
        },
        media: [{ id: "cover-img-1" }],
        _count: { pages: 5 },
      });
      storyQueryRaw.mockResolvedValue([{ c: BigInt(4) }]);
      storyPageCount.mockResolvedValue(3);

      const shell = await getStoryEditorShell(VALID_STORY_ID);

      expect(storyFindUnique).toHaveBeenCalledTimes(1);
      expect(storyQueryRaw).toHaveBeenCalledTimes(1);
      expect(storyPageCount).toHaveBeenCalledTimes(1);

      expect(shell).toMatchObject({
        id: VALID_STORY_ID,
        title: "Pergi ke Dokter Gigi",
        pageCount: 5,
        pagesWithText: 4,
        pagesWithMedia: 3,
        coverMediaId: "cover-img-1",
      });
    });
  });
});
