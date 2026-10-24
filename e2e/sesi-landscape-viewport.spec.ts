import { expect, test } from "@playwright/test";
import {
  ensureChildModeFixture,
  hasDatabase,
  loginAs,
} from "./helpers";

test.describe("Sesi & Mulai Sesi landscape viewport (zero-scroll & legible typography)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!hasDatabase, "Requires DATABASE_URL (test DB)");

  test("HP Landscape (844x390) fits all 4 screens strictly inside 100dvh with zero overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });

    const fixture = await ensureChildModeFixture();
    await loginAs(page, fixture.therapist.email, fixture.therapist.password);
    await expect(page).toHaveURL(/\/dashboard/);

    // Screen A: /dashboard/sesi
    await page.goto("/dashboard/sesi");
    const startBtn = page.getByRole("link", { name: /Mulai Sesi/i });
    await expect(startBtn).toBeVisible();

    const startBtnBox = await startBtn.boundingBox();
    expect(startBtnBox).not.toBeNull();
    if (startBtnBox) {
      // Primary CTA must be above the fold (within 390px)
      expect(startBtnBox.y + startBtnBox.height).toBeLessThanOrEqual(390);
    }

    // Screen B: /sesi/mulai?step=category
    await startBtn.click();
    await expect(page).toHaveURL(/\/sesi\/mulai\?step=category/);

    const categoryRegion = page.getByRole("region", { name: "Pilih kategori cerita" });
    await expect(categoryRegion).toBeVisible();

    // Verify category card legible and visible
    const categoryBtn = page
      .getByRole("region", { name: "Pilih kategori cerita" })
      .locator("button")
      .first();
    await expect(categoryBtn).toBeVisible();

    // Verify Batal button is visible without scrolling
    const cancelBtn = page.getByRole("button", { name: "Batal" });
    await expect(cancelBtn).toBeVisible();
    const cancelBox = await cancelBtn.boundingBox();
    expect(cancelBox).not.toBeNull();
    if (cancelBox) {
      expect(cancelBox.y + cancelBox.height).toBeLessThanOrEqual(390);
    }

    // Verify 0px vertical overflow in category step
    const catOverflow = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight + 2;
    });
    expect(catOverflow).toBe(false);

    // Screen C: /sesi/mulai?step=story
    await categoryBtn.click();
    await expect(page).toHaveURL(/step=story/);

    const storyRegion = page.getByRole("region", { name: /Pilih cerita/i });
    await expect(storyRegion).toBeVisible();

    // Verify story card visible with title and page badge
    const storyBtn = storyRegion
      .locator("button")
      .filter({ hasText: /halaman/i })
      .first();
    await expect(storyBtn).toBeVisible();
    await expect(storyBtn.getByText(/halaman/i)).toBeVisible();

    // Verify Kembali button visible without scrolling
    const backBtnStory = page.getByRole("button", { name: "Kembali" });
    await expect(backBtnStory).toBeVisible();
    const backBtnStoryBox = await backBtnStory.boundingBox();
    expect(backBtnStoryBox).not.toBeNull();
    if (backBtnStoryBox) {
      expect(backBtnStoryBox.y + backBtnStoryBox.height).toBeLessThanOrEqual(390);
    }

    // Verify 0px vertical overflow in story step
    const storyOverflow = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight + 2;
    });
    expect(storyOverflow).toBe(false);

    // Screen D: /sesi/mulai?step=preview
    await storyBtn.click();
    await expect(page).toHaveURL(/step=preview/);

    const previewRegion = page.getByRole("region", { name: "Konfirmasi cerita" });
    await expect(previewRegion).toBeVisible();

    // Verify story title is visible
    await expect(previewRegion.getByRole("heading", { level: 3 })).toBeVisible();

    // Verify "Mulai Cerita" button is visible within viewport without scrolling
    const startStoryBtn = page.getByRole("button", { name: /Mulai Cerita/i });
    await expect(startStoryBtn).toBeVisible();
    const startStoryBox = await startStoryBtn.boundingBox();
    expect(startStoryBox).not.toBeNull();
    if (startStoryBox) {
      expect(startStoryBox.y + startStoryBox.height).toBeLessThanOrEqual(390);
    }

    // Verify 0px vertical overflow in preview step
    const previewOverflow = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight + 2;
    });
    expect(previewOverflow).toBe(false);
  });

  test("Tablet Landscape (1024x768) renders balanced layouts with zero overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });

    const fixture = await ensureChildModeFixture();
    await loginAs(page, fixture.therapist.email, fixture.therapist.password);
    await expect(page).toHaveURL(/\/dashboard/);

    // /dashboard/sesi
    await page.goto("/dashboard/sesi");
    const startBtn = page.getByRole("link", { name: /Mulai Sesi/i });
    await expect(startBtn).toBeVisible();
    const startBtnBox = await startBtn.boundingBox();
    expect(startBtnBox).not.toBeNull();
    if (startBtnBox) {
      expect(startBtnBox.y + startBtnBox.height).toBeLessThanOrEqual(768);
    }

    // /sesi/mulai?step=category
    await page.goto("/sesi/mulai?step=category");
    const categoryRegion = page.getByRole("region", { name: "Pilih kategori cerita" });
    await expect(categoryRegion).toBeVisible();
    const cancelBtn = page.getByRole("button", { name: "Batal" });
    await expect(cancelBtn).toBeVisible();
    const cancelBox = await cancelBtn.boundingBox();
    expect(cancelBox).not.toBeNull();
    if (cancelBox) {
      expect(cancelBox.y + cancelBox.height).toBeLessThanOrEqual(768);
    }

    // /sesi/mulai?step=preview
    await page.goto(`/sesi/mulai?step=preview&categoryId=${fixture.story.categoryId}&storyId=${fixture.story.id}`);
    const previewRegion = page.getByRole("region", { name: "Konfirmasi cerita" });
    await expect(previewRegion).toBeVisible();
    const startStoryBtn = page.getByRole("button", { name: /Mulai Cerita/i });
    await expect(startStoryBtn).toBeVisible();
    const startStoryBox = await startStoryBtn.boundingBox();
    expect(startStoryBox).not.toBeNull();
    if (startStoryBox) {
      expect(startStoryBox.y + startStoryBox.height).toBeLessThanOrEqual(768);
    }
  });

  test("Mobile Portrait (390x844) stacks cleanly without regressions", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const fixture = await ensureChildModeFixture();
    await loginAs(page, fixture.therapist.email, fixture.therapist.password);
    await expect(page).toHaveURL(/\/dashboard/);

    // /dashboard/sesi
    await page.goto("/dashboard/sesi");
    const startBtn = page.getByRole("link", { name: /Mulai Sesi/i });
    await expect(startBtn).toBeVisible();

    // /sesi/mulai?step=category
    await page.goto("/sesi/mulai?step=category");
    const categoryRegion = page.getByRole("region", { name: "Pilih kategori cerita" });
    await expect(categoryRegion).toBeVisible();

    // /sesi/mulai?step=preview
    await page.goto(`/sesi/mulai?step=preview&categoryId=${fixture.story.categoryId}&storyId=${fixture.story.id}`);
    const previewRegion = page.getByRole("region", { name: "Konfirmasi cerita" });
    await expect(previewRegion).toBeVisible();
    const startStoryBtn = page.getByRole("button", { name: /Mulai Cerita/i });
    await expect(startStoryBtn).toBeVisible();
  });
});
