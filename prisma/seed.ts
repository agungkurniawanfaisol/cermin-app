import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

config({ path: resolve(process.cwd(), ".env.local") });
config();

if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
  throw new Error(
    "Refusing to seed in production (set ALLOW_SEED=true to override)",
  );
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set (needed for seed)");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function ensureAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@cermin.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-strong";
  const name = process.env.SEED_ADMIN_NAME ?? "Administrator";

  const existing = await prisma.user.findUnique({
    where: { email },
    include: {
      accounts: { where: { providerId: "credential" } },
      preference: true,
    },
  });

  if (!existing) {
    const hashed = await hashPassword(password);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          role: UserRole.ADMIN,
          emailVerified: true,
          preference: { create: {} },
        },
      });
      await tx.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: hashed,
        },
      });
    });
    console.log("Seeded admin:", email);
    return;
  }

  if (existing.accounts.length === 0) {
    const hashed = await hashPassword(password);
    await prisma.$transaction(async (tx) => {
      await tx.account.create({
        data: {
          userId: existing.id,
          accountId: existing.id,
          providerId: "credential",
          password: hashed,
        },
      });
      if (!existing.preference) {
        await tx.userPreference.create({
          data: { userId: existing.id },
        });
      }
    });
    console.log("Backfilled credential account for admin:", email);
  }
}

async function ensureCategories(): Promise<void> {
  const categories = [
    { name: "Bergiliran", sortOrder: 1 },
    { name: "Menerima Kemenangan dan Kekalahan", sortOrder: 2 },
  ];
  for (const c of categories) {
    const found = await prisma.storyCategory.findFirst({
      where: { name: c.name },
    });
    if (!found) {
      await prisma.storyCategory.create({ data: c });
    }
  }
}

async function main() {
  await ensureAdmin();
  await ensureCategories();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
