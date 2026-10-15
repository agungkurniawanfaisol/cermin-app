import { expect, test } from "@playwright/test";
import {
  ensureIsolationFixture,
  hasDatabase,
  loginAs,
} from "./helpers";

test.describe("isolation", () => {
  test.skip(
    !hasDatabase,
    "Requires DATABASE_URL (test DB) — terapis B cannot see murid of terapis A",
  );

  test("terapis B cannot see murid assigned only to terapis A", async ({
    page,
  }) => {
    const fixture = await ensureIsolationFixture();

    await loginAs(
      page,
      fixture.therapistB.email,
      fixture.therapistB.password,
    );
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/dashboard/murid");
    await expect(page.getByRole("heading", { name: "Murid" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: fixture.studentOfA.displayName }),
    ).toHaveCount(0);

    await page.goto(`/dashboard/murid/${fixture.studentOfA.id}`);
    await expect(page).toHaveURL(/\/dashboard\/murid$/);
    await expect(
      page.getByRole("heading", { name: fixture.studentOfA.displayName }),
    ).toHaveCount(0);
  });
});
