import { expect, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  MediaKind,
  PrismaClient,
  StoryStatus,
  UserRole,
  UserStatus,
  type Prisma,
} from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

export const hasDatabase = Boolean(process.env.DATABASE_URL);

export const adminEmail =
  process.env.SEED_ADMIN_EMAIL ?? "admin@cermin.local";
export const adminPassword =
  process.env.SEED_ADMIN_PASSWORD ?? "change-me-strong";

let prismaSingleton: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for e2e fixtures");
  }
  if (!prismaSingleton) {
    prismaSingleton = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }
  return prismaSingleton;
}

export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
}

export async function expectDashboard(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /Dasbor CERMIN/i })).toBeVisible();
}

async function ensureCredentialUser(input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  status?: UserStatus;
}): Promise<{ id: string; email: string }> {
  const prisma = getPrisma();
  const status = input.status ?? UserStatus.ACTIVE;
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    include: { accounts: { where: { providerId: "credential" } } },
  });

  const hashed = await hashPassword(input.password);

  if (!existing) {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          role: input.role,
          status,
          emailVerified: true,
          preference: { create: {} },
        },
      });
      await tx.account.create({
        data: {
          userId: created.id,
          accountId: created.id,
          providerId: "credential",
          password: hashed,
        },
      });
      return created;
    });
    return { id: user.id, email: user.email };
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: { role: input.role, status, name: input.name },
  });

  if (existing.accounts.length === 0) {
    await prisma.account.create({
      data: {
        userId: existing.id,
        accountId: existing.id,
        providerId: "credential",
        password: hashed,
      },
    });
  } else {
    await prisma.account.update({
      where: { id: existing.accounts[0]!.id },
      data: { password: hashed },
    });
  }

  return { id: existing.id, email: existing.email };
}

export async function ensureIsolationFixture(): Promise<{
  therapistA: { id: string; email: string; password: string };
  therapistB: { id: string; email: string; password: string };
  studentOfA: { id: string; displayName: string };
}> {
  const prisma = getPrisma();
  const password = "e2e-password-strong";

  const therapistA = await ensureCredentialUser({
    email: "e2e-terapis-a@cermin.local",
    password,
    name: "E2E Terapis A",
    role: UserRole.TERAPIS,
  });
  const therapistB = await ensureCredentialUser({
    email: "e2e-terapis-b@cermin.local",
    password,
    name: "E2E Terapis B",
    role: UserRole.TERAPIS,
  });
  const admin = await ensureCredentialUser({
    email: adminEmail,
    password: adminPassword,
    name: process.env.SEED_ADMIN_NAME ?? "Administrator",
    role: UserRole.ADMIN,
  });

  const displayName = "E2E Murid Isolasi A";
  let student = await prisma.student.findFirst({
    where: { displayName },
  });
  if (!student) {
    student = await prisma.student.create({
      data: { displayName },
    });
  }

  await prisma.therapistAssignment.updateMany({
    where: { studentId: student.id, endedAt: null },
    data: { endedAt: new Date() },
  });
  await prisma.therapistAssignment.create({
    data: {
      therapistId: therapistA.id,
      studentId: student.id,
      assignedById: admin.id,
    },
  });

  return {
    therapistA: { ...therapistA, password },
    therapistB: { ...therapistB, password },
    studentOfA: { id: student.id, displayName },
  };
}

export async function ensureChildModeFixture(): Promise<{
  therapist: { id: string; email: string; password: string };
  student: { id: string; displayName: string };
  story: { id: string; title: string };
}> {
  const prisma = getPrisma();
  const password = "e2e-password-strong";

  const therapist = await ensureCredentialUser({
    email: "e2e-terapis-child@cermin.local",
    password,
    name: "E2E Terapis Child",
    role: UserRole.TERAPIS,
  });
  const admin = await ensureCredentialUser({
    email: adminEmail,
    password: adminPassword,
    name: process.env.SEED_ADMIN_NAME ?? "Administrator",
    role: UserRole.ADMIN,
  });

  let category = await prisma.storyCategory.findFirst({
    where: { name: "Bergiliran" },
  });
  if (!category) {
    category = await prisma.storyCategory.create({
      data: { name: "Bergiliran", sortOrder: 1 },
    });
  }

  const displayName = "E2E Murid Child Mode";
  let student = await prisma.student.findFirst({ where: { displayName } });
  if (!student) {
    student = await prisma.student.create({ data: { displayName } });
  }

  await prisma.therapistAssignment.updateMany({
    where: { studentId: student.id, endedAt: null },
    data: { endedAt: new Date() },
  });
  await prisma.therapistAssignment.create({
    data: {
      therapistId: therapist.id,
      studentId: student.id,
      assignedById: admin.id,
    },
  });

  const title = "E2E Cerita Child Mode";
  let story = await prisma.story.findFirst({
    where: { title, createdById: admin.id },
    include: { pages: { orderBy: { sortOrder: "asc" } } },
  });

  if (!story) {
    story = await prisma.story.create({
      data: {
        title,
        description: "Fixture e2e",
        learningObjectives: "Tes mode anak",
        status: StoryStatus.PUBLISHED,
        publishedAt: new Date(),
        categoryId: category.id,
        createdById: admin.id,
        pages: {
          create: [
            { sortOrder: 0, bodyText: "Halaman satu e2e." },
            { sortOrder: 1, bodyText: "Halaman dua e2e." },
          ],
        },
      },
      include: { pages: { orderBy: { sortOrder: "asc" } } },
    });
  } else if (story.status !== StoryStatus.PUBLISHED) {
    story = await prisma.story.update({
      where: { id: story.id },
      data: {
        status: StoryStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: { pages: { orderBy: { sortOrder: "asc" } } },
    });
  }

  if (story.pages.length < 2) {
    const existingOrders = new Set(story.pages.map((p) => p.sortOrder));
    const pagesToCreate: Prisma.StoryPageCreateWithoutStoryInput[] = [];
    for (let order = 0; order < 2; order += 1) {
      if (!existingOrders.has(order)) {
        pagesToCreate.push({
          sortOrder: order,
          bodyText: `Halaman ${order + 1} e2e.`,
        });
      }
    }
    if (pagesToCreate.length > 0) {
      await prisma.storyPage.createMany({
        data: pagesToCreate.map((p) => ({
          storyId: story!.id,
          sortOrder: p.sortOrder!,
          bodyText: p.bodyText ?? "",
        })),
      });
    }
    story = await prisma.story.findUniqueOrThrow({
      where: { id: story.id },
      include: { pages: { orderBy: { sortOrder: "asc" } } },
    });
  }

  const firstPage = story.pages[0]!;
  const existingAudio = await prisma.mediaAsset.findFirst({
    where: { pageId: firstPage.id, kind: MediaKind.AUDIO },
  });
  if (!existingAudio) {
    await prisma.mediaAsset.create({
      data: {
        storyId: story.id,
        pageId: firstPage.id,
        kind: MediaKind.AUDIO,
        storageKey: `e2e/${story.id}/page-0-audio.mp3`,
        mimeType: "audio/mpeg",
        byteSize: 1024,
        createdById: admin.id,
        sortOrder: 0,
      },
    });
  }

  return {
    therapist: { ...therapist, password },
    student: { id: student.id, displayName },
    story: { id: story.id, title },
  };
}

export async function ensureDisabledUser(): Promise<{
  email: string;
  password: string;
}> {
  const password = "e2e-password-strong";
  const email = "e2e-disabled@cermin.local";
  await ensureCredentialUser({
    email,
    password,
    name: "E2E Disabled",
    role: UserRole.TERAPIS,
    status: UserStatus.DISABLED,
  });
  return { email, password };
}
