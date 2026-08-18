import { expect, test, type Page } from "@playwright/test";

const appOrigin = process.env.VIDMAGNET_TEST_URL?.replace(/\/$/, "") || "";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      authenticated: true,
      user: {
        id: "creator-1",
        email: "coach@example.com",
        firstName: "Coach",
        currentBrandId: null,
      },
    }),
  }));
  await page.route("**/api/brands", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: "[]",
  }));
  await page.route("**/api/branding", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: "{}",
  }));
});

async function fillQuizBrief(page: Page) {
  await page.getByLabel("Quiz title").fill("Find your shooting priority");
  await page.getByLabel("Who is this for?").fill("Developing basketball players");
  await page.getByLabel("What should the quiz reveal?").fill("The next skill they should train");
}

test("Interactive Quiz creation starts with one YouTube source and submits no pasted text", async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/quizzes/generate", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ guide: { id: 91, title: "Find your shooting priority" }, quiz: {}, landingPage: {} }),
    });
  });

  await page.goto(`${appOrigin}/create`);
  await page.getByRole("button", { name: /Interactive Quiz/ }).click();

  await expect(page.getByRole("button", { name: /YouTube video/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Paste source content/ })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Content", exact: true })).toHaveCount(0);

  await fillQuizBrief(page);
  await page.getByLabel("YouTube video URL").fill("https://youtu.be/WvUSs6yTltE");
  await page.getByRole("button", { name: "Generate interactive quiz" }).click();

  await expect(page).toHaveURL(/\/quiz-editor\/91$/);
  expect(submitted).toMatchObject({
    youtubeUrl: "https://youtu.be/WvUSs6yTltE",
    questionCount: 6,
    outcomeCount: 3,
    includeInLibrary: true,
  });
  expect(submitted).not.toHaveProperty("sourceContent");
});

test("Interactive Quiz errors retain the selected YouTube source and settings", async ({ page }) => {
  await page.route("**/api/quizzes/generate", (route) => route.fulfill({
    status: 422,
    contentType: "application/json",
    body: JSON.stringify({
      message: "VidMagnet could not get a usable transcript from that video. Try another public video or paste the source content instead.",
    }),
  }));

  await page.goto(`${appOrigin}/create`);
  await page.getByRole("button", { name: /Interactive Quiz/ }).click();
  await fillQuizBrief(page);
  const source = page.getByLabel("YouTube video URL");
  await source.fill("https://www.youtube.com/watch?v=WvUSs6yTltE");
  await page.getByRole("button", { name: "Generate interactive quiz" }).click();

  await expect(page.getByRole("alert")).toContainText("could not get a usable transcript");
  await expect(page.getByRole("alert")).toContainText("Your source and settings are still here");
  await expect(source).toHaveValue("https://www.youtube.com/watch?v=WvUSs6yTltE");
  await expect(page.getByLabel("Quiz title")).toHaveValue("Find your shooting priority");
});
