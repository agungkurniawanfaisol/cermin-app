import { createAuthClient } from "better-auth/react";
import { normalizeAppUrl } from "@/lib/app-url";

export const authClient = createAuthClient({
  baseURL:
    normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeAppUrl(process.env.BETTER_AUTH_URL),
});
