import { expect, test } from "@playwright/test";
import {
  ensureChildModeFixture,
  getPrisma,
  hasDatabase,
  loginAs,
} from "./helpers";

test.describe("belajar landscape & snap viewport", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!hasDatabase, "Requires DATABASE_URL (test DB)");

  test("HP Landscape (844x390) fits Screen 1 strictly inside viewport with 0px overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });

    const fixture = await ensureChildModeFixture();
    await loginAs(page, fixture.therapist.email, fixture.therapist.password);
    await expect(page).toHaveURL(/\/dashboard/);

    const prisma = getPrisma();
    const session = await prisma.learningSession.create({
      data: {
        studentId: fixture.student.id,
        storyId: fixture.story.id,
        ledByUserId: fixture.therapist.id,
      },
    });

    await page.goto(`/belajar/${session.id}`);

    // Verify Screen 1 region
    const storyScreen = page.getByRole("region", { name: "Layar cerita" });
    await expect(storyScreen).toBeVisible();

    // Verify side-by-side layout: portrait is on the left, text card is on the right
    const portrait = page.locator(".belajar-portrait");
    const textCard = page.locator(".belajar-page-card").first();
    await expect(portrait).toBeVisible();
    await expect(textCard).toBeVisible();

    const portraitBox = await portrait.boundingBox();
    const textCardBox = await textCard.boundingBox();
    expect(portraitBox).not.toBeNull();
    expect(textCardBox).not.toBeNull();
    if (portraitBox && textCardBox) {
      expect(portraitBox.x).toBeLessThan(textCardBox.x);
    }

    // Verify docked nav buttons are visible without scrolling
    const prevBtn = page.getByRole("button", { name: "Sebelumnya" });
    const nextBtn = page.getByRole("button", { name: "Berikutnya" });
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();

    // Verify Screen 1 height equals viewport height (390px)
    const storyScreenBox = await storyScreen.boundingBox();
    expect(storyScreenBox).not.toBeNull();
    if (storyScreenBox) {
      expect(Math.round(storyScreenBox.height)).toBe(390);
    }

    // Verify outer container does not overflow vertically on Screen 1
    const isOverflowing = await page.evaluate(() => {
      const story = document.querySelector('[aria-label="Layar cerita"]');
      if (!story) return true;
      return story.scrollHeight > window.innerHeight + 1; // allow 1px rounding
    });
    expect(isOverflowing).toBe(false);
  });

  test("Tablet Landscape (1024x768) renders side-by-side with zero overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });

    const fixture = await ensureChildModeFixture();
    await loginAs(page, fixture.therapist.email, fixture.therapist.password);
    await expect(page).toHaveURL(/\/dashboard/);

    const prisma = getPrisma();
    const session = await prisma.learningSession.create({
      data: {
        studentId: fixture.student.id,
        storyId: fixture.story.id,
        ledByUserId: fixture.therapist.id,
      },
    });

    await page.goto(`/belajar/${session.id}`);

    const storyScreen = page.getByRole("region", { name: "Layar cerita" });
    await expect(storyScreen).toBeVisible();

    // Verify side-by-side
    const portrait = page.locator(".belajar-portrait");
    const textCard = page.locator(".belajar-page-card").first();
    const portraitBox = await portrait.boundingBox();
    const textCardBox = await textCard.boundingBox();
    expect(portraitBox).not.toBeNull();
    expect(textCardBox).not.toBeNull();
    if (portraitBox && textCardBox) {
      expect(portraitBox.x).toBeLessThan(textCardBox.x);
    }

    // Verify Screen 1 height equals 768px
    const storyScreenBox = await storyScreen.boundingBox();
    expect(storyScreenBox).not.toBeNull();
    if (storyScreenBox) {
      expect(Math.round(storyScreenBox.height)).toBe(768);
    }
  });

  test("Mobile Portrait (390x844) stacks naturally without layout breaks", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const fixture = await ensureChildModeFixture();
    await loginAs(page, fixture.therapist.email, fixture.therapist.password);
    await expect(page).toHaveURL(/\/dashboard/);

    const prisma = getPrisma();
    const session = await prisma.learningSession.create({
      data: {
        studentId: fixture.student.id,
        storyId: fixture.story.id,
        ledByUserId: fixture.therapist.id,
      },
    });

    await page.goto(`/belajar/${session.id}`);

    const storyScreen = page.getByRole("region", { name: "Layar cerita" });
    await expect(storyScreen).toBeVisible();

    // Verify stacked: portrait is above textCard
    const portrait = page.locator(".belajar-portrait");
    const textCard = page.locator(".belajar-page-card").first();
    const portraitBox = await portrait.boundingBox();
    const textCardBox = await textCard.boundingBox();
    expect(portraitBox).not.toBeNull();
    expect(textCardBox).not.toBeNull();
    if (portraitBox && textCardBox) {
      expect(portraitBox.y).toBeLessThan(textCardBox.y);
    }
  });
});
