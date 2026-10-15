import { expect, test } from "@playwright/test";
import {
  adminEmail,
  adminPassword,
  ensureDisabledUser,
  expectDashboard,
  hasDatabase,
  loginAs,
} from "./helpers";

test.describe("auth", () => {
  test.skip(!hasDatabase, "Requires DATABASE_URL (test DB)");

  test("admin login succeeds with SEED_ADMIN credentials", async ({ page }) => {
    await loginAs(page, adminEmail, adminPassword);
    await expectDashboard(page);
    await expect(page.getByText(/Selamat datang/i)).toBeVisible();
  });

  test("disabled user cannot reach dashboard", async ({ page }) => {
    const disabled = await ensureDisabledUser();
    await loginAs(page, disabled.email, disabled.password);

    // better-auth may accept credentials; requireSession redirects DISABLED to /login
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
