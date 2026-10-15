"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";

export type ActionOk = { ok: true };
export type ActionErr = { ok: false; error: string };
export type ActionResult = ActionOk | ActionErr;

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib"),
});

/** Login email/password dengan batas laju per IP + email. */
export async function loginWithEmail(input: {
  email: string;
  password: string;
}): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid",
    };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const ip = await getRequestIp();

  const byIp = checkRateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
  if (!byIp.ok) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }
  const byEmail = checkRateLimit(`login:email:${email}`, 10, 15 * 60 * 1000);
  if (!byEmail.ok) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  try {
    const result = await auth.api.signInEmail({
      body: {
        email,
        password: parsed.data.password,
      },
      headers: await headers(),
    });

    if (!result) {
      return { ok: false, error: "Email atau kata sandi salah" };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Email atau kata sandi salah" };
  }
}
