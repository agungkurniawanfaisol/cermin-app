import { cache } from "react";
import { prisma } from "@/lib/db";

export type PublicFaq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
};

/** FAQ terbit untuk landing (tanpa sesi). Cap 20 — index isPublished+sortOrder. */
export const listPublishedFaqsPublic = cache(async (): Promise<PublicFaq[]> => {
  try {
    return await prisma.faqItem.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 20,
      select: {
        id: true,
        question: true,
        answer: true,
        sortOrder: true,
      },
    });
  } catch {
    // Landing tidak boleh 500 jika DB/FAQ sementara gagal.
    return [];
  }
});
