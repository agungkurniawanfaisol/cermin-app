import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthzError } from "@/server/policies/access";

const writeAudit = vi.fn();
const revalidatePath = vi.fn();
const requireRole = vi.fn();
const requireSession = vi.fn();
const faqItemCreate = vi.fn();
const faqItemFindMany = vi.fn();
const faqItemFindUnique = vi.fn();
const faqItemUpdate = vi.fn();
const faqItemDelete = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: (...args: unknown[]) => writeAudit(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    faqItem: {
      create: (...args: unknown[]) => faqItemCreate(...args),
      findMany: (...args: unknown[]) => faqItemFindMany(...args),
      findUnique: (...args: unknown[]) => faqItemFindUnique(...args),
      update: (...args: unknown[]) => faqItemUpdate(...args),
      delete: (...args: unknown[]) => faqItemDelete(...args),
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
  };
});

describe("help FAQ actions authz/audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createFaq when requireRole throws AuthzError → ok:false; no audit; no create", async () => {
    requireRole.mockRejectedValue(new AuthzError());
    const { createFaq } = await import("@/server/actions/faqs");

    const result = await createFaq({
      question: "Tes?",
      answer: "Jawaban tes.",
    });

    expect(result.ok).toBe(false);
    expect(writeAudit).not.toHaveBeenCalled();
    expect(faqItemCreate).not.toHaveBeenCalled();
  });

  it("createFaq as admin → ok:true; faq.create audit once; create called", async () => {
    requireRole.mockResolvedValue({
      id: "admin-1",
      email: "admin@cermin.local",
      name: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
    });
    faqItemCreate.mockResolvedValue({
      id: "faq-1",
      question: "Tes admin?",
    });

    const { createFaq } = await import("@/server/actions/faqs");
    const result = await createFaq({
      question: "Tes admin?",
      answer: "Jawaban dari admin.",
      sortOrder: 2,
    });

    expect(result.ok).toBe(true);
    expect(faqItemCreate).toHaveBeenCalledTimes(1);
    expect(faqItemCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          question: "Tes admin?",
          answer: "Jawaban dari admin.",
          sortOrder: 2,
          isPublished: true,
          createdById: "admin-1",
        }),
      }),
    );
    expect(writeAudit).toHaveBeenCalledTimes(1);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "faq.create",
        entityType: "FaqItem",
        entityId: "faq-1",
        actorId: "admin-1",
        metadata: expect.objectContaining({ question: "Tes admin?" }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/bantuan");
  });
});
