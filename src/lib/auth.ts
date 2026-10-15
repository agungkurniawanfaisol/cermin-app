import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
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
  session: {
    // Skip DB round-trip on getSession for a short window (Supabase ~200ms+/query).
    cookieCache: {
      enabled: true,
      maxAge: 60,
    },
  },
  // Prisma models use @db.Uuid; default nanoid ids would fail inserts.
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  // Set cookie sesi dari Server Action (loginWithEmail).
  plugins: [nextCookies()],
});

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "TERAPIS" | "ORANG_TUA";
  status: "ACTIVE" | "DISABLED";
};
