import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

config({ path: resolve(process.cwd(), ".env.local") });
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set (needed for seed)");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@cermin.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-strong";
  const name = process.env.SEED_ADMIN_NAME ?? "Administrator";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: UserRole.ADMIN,
        emailVerified: true,
        preference: { create: {} },
      },
    });
    const hashed = await hashPassword(password);
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashed,
      },
    });
    console.log("Seeded admin:", email);
  }

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

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
