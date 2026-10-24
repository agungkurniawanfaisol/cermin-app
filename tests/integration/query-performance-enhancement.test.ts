import { NextRequest } from "next/server";
import type * as AccessPolicies from "@/server/policies/access";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  batchGetCachedSignedUrls,
  batchSetCachedSignedUrls,
  clearSignedUrlCache,
  getCachedSignedUrl,
  setCachedSignedUrl,
} from "@/lib/signed-url-cache";
import {
  listLearningSessionsForViewer,
  getSessionForReader,
} from "@/server/actions/sessions";
import { GET as getMediaRoute } from "@/app/api/media/[id]/route";
import { GET as getCategoryCoverRoute } from "@/app/api/category/[id]/cover/route";
import { GET as getAvatarMeRoute } from "@/app/api/avatar/me/route";
import { GET as getAvatarStudentRoute } from "@/app/api/avatar/student/[id]/route";

const requireSession = vi.fn();
const assertCanReadSession = vi.fn();
const assertCanAccessStudent = vi.fn();
const loadMediaForSignedUrl = vi.fn();
const listActiveStudentsForSessionMock = vi.fn();

const therapistAssignmentFindMany = vi.fn();
const parentLinkFindMany = vi.fn();
const learningSessionCount = vi.fn();
const learningSessionFindMany = vi.fn();
const learningSessionFindUnique = vi.fn();
const userPreferenceFindUnique = vi.fn();
const storyCategoryFindUnique = vi.fn();
const userFindUnique = vi.fn();
const studentFindUnique = vi.fn();

const storageCreateSignedUrl = vi.fn();
const storageCreateSignedUrls = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("@/server/policies/access", async (importOriginal) => {
  const actual = await importOriginal<typeof AccessPolicies>();
  return {
    ...actual,
    requireSession: (...args: unknown[]) => requireSession(...args),
    assertCanReadSession: (...args: unknown[]) =>
      assertCanReadSession(...args),
    assertCanAccessStudent: (...args: unknown[]) =>
      assertCanAccessStudent(...args),
    loadMediaForSignedUrl: (...args: unknown[]) =>
      loadMediaForSignedUrl(...args),
  };
});

vi.mock("@/server/actions/students", () => ({
  listActiveStudentsForSession: (...args: unknown[]) =>
    listActiveStudentsForSessionMock(...args),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    storage: {
      from: () => ({
        createSignedUrl: (...args: unknown[]) => storageCreateSignedUrl(...args),
        createSignedUrls: (...args: unknown[]) =>
          storageCreateSignedUrls(...args),
      }),
    },
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    therapistAssignment: {
      findMany: (...args: unknown[]) => therapistAssignmentFindMany(...args),
    },
    parentLink: {
      findMany: (...args: unknown[]) => parentLinkFindMany(...args),
    },
    learningSession: {
      count: (...args: unknown[]) => learningSessionCount(...args),
      findMany: (...args: unknown[]) => learningSessionFindMany(...args),
      findUnique: (...args: unknown[]) => learningSessionFindUnique(...args),
    },
    userPreference: {
      findUnique: (...args: unknown[]) => userPreferenceFindUnique(...args),
    },
    storyCategory: {
      findUnique: (...args: unknown[]) => storyCategoryFindUnique(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => userFindUnique(...args),
    },
    student: {
      findUnique: (...args: unknown[]) => studentFindUnique(...args),
    },
  },
}));

const VALID_STUDENT_A = "11111111-1111-4111-8111-111111111111";
const VALID_STUDENT_B = "22222222-2222-4222-8222-222222222222";
const VALID_SESSION_ID = "33333333-3333-4333-8333-333333333333";
const VALID_MEDIA_ID = "44444444-4444-4444-8444-444444444444";
const VALID_CATEGORY_ID = "55555555-5555-4555-8555-555555555555";

describe("Query Performance & Caching Enhancements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSignedUrlCache();
  });

  describe("listLearningSessionsForViewer: indexed studentId queries & early returns", () => {
    it("returns early with 0 queries when a therapist has no assigned students", async () => {
      requireSession.mockResolvedValue({
        id: "therapist-empty",
        role: "TERAPIS",
        status: "ACTIVE",
      });
      therapistAssignmentFindMany.mockResolvedValue([]);

      const result = await listLearningSessionsForViewer();

      expect(therapistAssignmentFindMany).toHaveBeenCalledTimes(1);
      expect(learningSessionCount).not.toHaveBeenCalled();
      expect(learningSessionFindMany).not.toHaveBeenCalled();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("uses studentId: { in: [...] } index filter without nested subquery for therapist", async () => {
      requireSession.mockResolvedValue({
        id: "therapist-1",
        role: "TERAPIS",
        status: "ACTIVE",
      });
      therapistAssignmentFindMany.mockResolvedValue([
        { studentId: VALID_STUDENT_A },
        { studentId: VALID_STUDENT_B },
      ]);
      learningSessionCount.mockResolvedValue(1);
      learningSessionFindMany.mockResolvedValue([
        {
          id: VALID_SESSION_ID,
          startedAt: new Date(),
          endedAt: null,
          student: { id: VALID_STUDENT_A, displayName: "Alya" },
          story: { id: "story-1", title: "Cerita 1" },
          ledBy: { id: "therapist-1", name: "Terapis Satu" },
        },
      ]);

      const result = await listLearningSessionsForViewer();

      expect(therapistAssignmentFindMany).toHaveBeenCalledTimes(1);
      expect(learningSessionFindMany).toHaveBeenCalledTimes(1);

      const queryWhere = learningSessionFindMany.mock.calls[0]?.[0]?.where;
      expect(queryWhere).toEqual({
        AND: [
          {
            studentId: { in: [VALID_STUDENT_A, VALID_STUDENT_B] },
          },
        ],
      });
      expect(result.items).toHaveLength(1);
    });

    it("returns early when therapist requests an unassigned studentId", async () => {
      requireSession.mockResolvedValue({
        id: "therapist-1",
        role: "TERAPIS",
        status: "ACTIVE",
      });
      therapistAssignmentFindMany.mockResolvedValue([
        { studentId: VALID_STUDENT_A },
      ]);

      const result = await listLearningSessionsForViewer({
        studentId: VALID_STUDENT_B,
      });

      expect(therapistAssignmentFindMany).toHaveBeenCalledTimes(1);
      expect(learningSessionCount).not.toHaveBeenCalled();
      expect(learningSessionFindMany).not.toHaveBeenCalled();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("getSessionForReader: single unified database query", () => {
    it("fetches session with nested pages and observations in a single findUnique call", async () => {
      requireSession.mockResolvedValue({
        id: "therapist-1",
        role: "TERAPIS",
        status: "ACTIVE",
      });
      assertCanReadSession.mockResolvedValue(undefined);
      userPreferenceFindUnique.mockResolvedValue({
        textSize: "MD",
        audioEnabled: true,
      });
      listActiveStudentsForSessionMock.mockResolvedValue([
        { id: VALID_STUDENT_A, displayName: "Alya" },
      ]);

      learningSessionFindUnique.mockResolvedValue({
        id: VALID_SESSION_ID,
        startedAt: new Date(),
        endedAt: null,
        studentId: VALID_STUDENT_A,
        storyId: "story-1",
        ledByUserId: "therapist-1",
        student: { id: VALID_STUDENT_A, displayName: "Alya" },
        story: {
          id: "story-1",
          title: "Cerita Bersama",
          category: { name: "Sosial" },
          pages: [
            {
              id: "page-1",
              sortOrder: 1,
              bodyText: "Halaman satu",
              media: [],
              mcq: null,
            },
          ],
        },
        observations: [
          {
            id: "obs-1",
            note: "Catatan baik",
            recordedAt: new Date(),
            recordedBy: { id: "therapist-1", name: "Terapis Satu" },
          },
        ],
      });

      const session = await getSessionForReader(VALID_SESSION_ID);

      expect(learningSessionFindUnique).toHaveBeenCalledTimes(1);
      const callSelect = learningSessionFindUnique.mock.calls[0]?.[0]?.select;
      expect(callSelect.story.select.pages).toBeDefined();
      expect(callSelect.observations).toBeDefined();

      expect(session.id).toBe(VALID_SESSION_ID);
      expect(session.pages).toHaveLength(1);
      expect(session.observations).toHaveLength(1);
    });
  });

  describe("signedUrlCache: in-memory caching and eviction", () => {
    it("caches signed URLs and returns hit without hitting storage", () => {
      setCachedSignedUrl("cermin-media", "test-key.jpg", "https://cached.url", 300);

      const cached = getCachedSignedUrl("cermin-media", "test-key.jpg");
      expect(cached).toBe("https://cached.url");
    });

    it("evicts cached URLs with less than 30 seconds remaining TTL", () => {
      setCachedSignedUrl("cermin-media", "expiring-key.jpg", "https://expiring.url", 25);

      const cached = getCachedSignedUrl("cermin-media", "expiring-key.jpg");
      expect(cached).toBeNull();
    });

    it("batch lookup accurately separates hits and misses", () => {
      setCachedSignedUrl("cermin-media", "key1.jpg", "https://url1", 300);

      const { hits, misses } = batchGetCachedSignedUrls("cermin-media", [
        "key1.jpg",
        "key2.jpg",
      ]);

      expect(hits.get("key1.jpg")).toBe("https://url1");
      expect(misses).toEqual(["key2.jpg"]);

      batchSetCachedSignedUrls(
        "cermin-media",
        [{ key: "key2.jpg", url: "https://url2" }],
        300,
      );
      expect(getCachedSignedUrl("cermin-media", "key2.jpg")).toBe("https://url2");
    });
  });

  describe("HTTP Cache-Control Headers on Media & Avatar API routes", () => {
    it("api/media/[id] returns Cache-Control: private, max-age=120, stale-while-revalidate=60", async () => {
      requireSession.mockResolvedValue({
        id: "user-1",
        role: "TERAPIS",
        status: "ACTIVE",
      });
      loadMediaForSignedUrl.mockResolvedValue({
        storageBucket: "cermin-media",
        storageKey: "media/1.png",
      });
      storageCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://example.com/signed-media.png" },
        error: null,
      });

      const req = new NextRequest(`http://localhost:3000/api/media/${VALID_MEDIA_ID}`);
      const res = await getMediaRoute(req, {
        params: Promise.resolve({ id: VALID_MEDIA_ID }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe(
        "private, max-age=120, stale-while-revalidate=60",
      );
    });

    it("api/category/[id]/cover returns Cache-Control: private, max-age=120, stale-while-revalidate=60", async () => {
      requireSession.mockResolvedValue({
        id: "user-1",
        role: "TERAPIS",
        status: "ACTIVE",
      });
      storyCategoryFindUnique.mockResolvedValue({
        imageKey: "categories/cover.png",
      });
      storageCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://example.com/signed-cat.png" },
        error: null,
      });

      const req = new Request(`http://localhost:3000/api/category/${VALID_CATEGORY_ID}/cover`);
      const res = await getCategoryCoverRoute(req, {
        params: Promise.resolve({ id: VALID_CATEGORY_ID }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe(
        "private, max-age=120, stale-while-revalidate=60",
      );
    });

    it("api/avatar/me returns Cache-Control: private, max-age=120, stale-while-revalidate=60", async () => {
      requireSession.mockResolvedValue({
        id: "user-1",
        role: "TERAPIS",
        status: "ACTIVE",
      });
      userFindUnique.mockResolvedValue({
        image: "avatars/users/user-1/profile.png",
      });
      storageCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://example.com/signed-user.png" },
        error: null,
      });

      const res = await getAvatarMeRoute();

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe(
        "private, max-age=120, stale-while-revalidate=60",
      );
    });

    it("api/avatar/student/[id] returns Cache-Control: private, max-age=120, stale-while-revalidate=60", async () => {
      requireSession.mockResolvedValue({
        id: "user-1",
        role: "TERAPIS",
        status: "ACTIVE",
      });
      assertCanAccessStudent.mockResolvedValue(undefined);
      studentFindUnique.mockResolvedValue({
        imageKey: "avatars/students/1/photo.png",
        fatherImageKey: null,
        motherImageKey: null,
      });
      storageCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://example.com/signed-student.png" },
        error: null,
      });

      const req = new Request(`http://localhost:3000/api/avatar/student/${VALID_STUDENT_A}`);
      const res = await getAvatarStudentRoute(req, {
        params: Promise.resolve({ id: VALID_STUDENT_A }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe(
        "private, max-age=120, stale-while-revalidate=60",
      );
    });
  });
});
