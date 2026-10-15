import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "ORANG_TUA",
        input: false,
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "ACTIVE",
        input: false,
      },
    },
  },
  // Prisma models use @db.Uuid; default nanoid ids would fail inserts.
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
});

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "TERAPIS" | "ORANG_TUA";
  status: "ACTIVE" | "DISABLED";
};
