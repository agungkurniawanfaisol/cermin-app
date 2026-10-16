import { expect, test } from "@playwright/test";
import {
  ensureChildModeFixture,
  hasDatabase,
  loginAs,
} from "./helpers";

async function assertNoAutoplayingMedia(page: import("@playwright/test").Page) {
  const playing = await page.evaluate(() => {
    const medias = Array.from(
      document.querySelectorAll("audio, video"),
    ) as HTMLMediaElement[];
    return medias.filter((el) => !el.paused || el.autoplay).map((el) => ({
      tag: el.tagName,
      paused: el.paused,
      autoplay: el.autoplay,
    }));
  });
  expect(playing, "media must not autoplay").toEqual([]);
}

test.describe("child mode", () => {
  test.skip(!hasDatabase, "Requires DATABASE_URL (test DB)");

  test("session flow: navigate pages, no audio autoplay, add observation", async ({
    page,
  }) => {
    const fixture = await ensureChildModeFixture();

    await loginAs(page, fixture.therapist.email, fixture.therapist.password);
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/dashboard/sesi");
    await page.locator("#sesi-murid").selectOption(fixture.student.id);
    if (await page.locator("#sesi-kategori").isVisible()) {
      await page.locator("#sesi-kategori").selectOption(fixture.story.categoryId);
    }
    await page.locator("#sesi-cerita").selectOption(fixture.story.id);
    await page.getByRole("button", { name: "Mulai sesi belajar" }).click();

    await expect(page).toHaveURL(/\/belajar\//);
    await expect(
      page.getByRole("heading", { name: fixture.story.title }),
    ).toBeVisible();
    await expect(page.getByText("Bergiliran")).toBeVisible();
    await expect(page.getByText("Halaman 1 dari 2")).toBeVisible();

    // Audio control present; nothing should be autoplaying
    await expect(
      page.getByRole("button", { name: "Putar suara" }),
    ).toBeVisible();
    await assertNoAutoplayingMedia(page);

    await page.getByRole("button", { name: "Berikutnya" }).click();
    await expect(page.getByText("Halaman 2 dari 2")).toBeVisible();
    await expect(page.getByText("Halaman dua e2e.")).toBeVisible();

    await page.getByRole("button", { name: "Sebelumnya" }).click();
    await expect(page.getByText("Halaman 1 dari 2")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Putar suara" }),
    ).toBeVisible();
    await assertNoAutoplayingMedia(page);

    await page.getByRole("button", { name: "Catatan terapis" }).click();
    await page.getByLabel("Catatan observasi").fill("E2E observasi singkat");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("E2E observasi singkat")).toBeVisible();
  });
});
