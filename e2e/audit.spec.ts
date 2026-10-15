import { expect, test } from "@playwright/test";
import {
  adminEmail,
  adminPassword,
  getPrisma,
  hasDatabase,
  loginAs,
} from "./helpers";

test.describe("audit trail", () => {
  test.skip(!hasDatabase, "Requires DATABASE_URL (test DB)");

  test("admin invite writes invite.create audit without token secrets", async ({
    page,
  }) => {
    const prisma = getPrisma();
    const stamp = Date.now();
    const email = `e2e-invite-audit-${stamp}@cermin.local`;
    const name = `E2E Invite Audit ${stamp}`;

    await loginAs(page, adminEmail, adminPassword);
    await page.goto("/dashboard/pengguna/undang");
    await expect(
      page.getByRole("heading", { name: /Undang pengguna/i }),
    ).toBeVisible();

    await page.getByLabel("Nama").fill(name);
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Buat undangan" }).click();

    await expect(
      page.getByText(/Tautan undangan/i),
    ).toBeVisible({ timeout: 15_000 });

    const invite = await prisma.inviteToken.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });
    expect(invite).toBeTruthy();

    const audit = await prisma.auditLog.findFirst({
      where: {
        action: "invite.create",
        entityType: "InviteToken",
        entityId: invite!.id,
      },
      orderBy: { createdAt: "desc" },
    });

    expect(audit).toBeTruthy();
    expect(audit!.action).toBe("invite.create");

    const meta = (audit!.metadata ?? {}) as Record<string, unknown>;
    expect(meta.email).toBe(email);
    expect(meta).not.toHaveProperty("token");
    expect(meta).not.toHaveProperty("tokenHash");
    expect(meta).not.toHaveProperty("password");
    expect(JSON.stringify(meta)).not.toMatch(/tokenHash|rawToken/i);
  });
});
