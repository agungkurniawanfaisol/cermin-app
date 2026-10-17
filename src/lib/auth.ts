import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { normalizeAppUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";

const baseURL =
  normalizeAppUrl(process.env.BETTER_AUTH_URL) ??
  normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);

// Better Auth baca env mentah — pastikan ada https:// sebelum init.
if (baseURL) {
  process.env.BETTER_AUTH_URL = baseURL;
  const publicUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL) ?? baseURL;
  process.env.NEXT_PUBLIC_APP_URL = publicUrl;
}

export const auth = betterAuth({
  ...(baseURL ? { baseURL } : {}),
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
    // Skip DB round-trip on getSession (Supabase ~200ms+/query).
    // 5 menit: navigasi dashboard lebih jarang hit session table.
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
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
