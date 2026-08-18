import { expect, test } from "@playwright/test";

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
        lastName: "AMG",
        currentBrandId: 16,
      },
    }),
  }));
  await page.route("**/api/brands", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([
      {
        id: 16,
        userId: "creator-1",
        name: "ILB Elite",
        isDefault: true,
        createdAt: "2026-08-18T00:00:00.000Z",
        updatedAt: "2026-08-18T00:00:00.000Z",
      },
    ]),
  }));
  await page.route("**/api/branding", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({}),
  }));
});

test("Guide creation uses the YouTube-first path and opens the editor only after confirmed success", async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  let releaseGeneration: (() => void) | undefined;
  const generationHeld = new Promise<void>((resolve) => {
    releaseGeneration = resolve;
  });

  await page.route("**/api/guides", async (route) => {
    submitted = route.request().postDataJSON();
    await generationHeld;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ guide: { id: 314, title: "Mid-Range Mastery" } }),
    });
  });

  await page.goto(`${appOrigin}/create/guide`);

  await expect(page.getByRole("button", { name: /YouTube video/i })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Paste transcript/i })).toBeVisible();
  await expect(page.getByText(/PDF Document|Audio File|Web Page|Streaming Link/)).toHaveCount(0);

  await page.getByLabel("YouTube video URL").fill("https://www.youtube.com/watch?v=WvUSs6yTltE");
  await page.getByRole("button", { name: "Generate Practice Guide" }).click();

  await expect(page.getByRole("dialog")).toContainText("Building your guide");
  await expect(page.getByRole("dialog")).toContainText("Longer videos can take a few minutes");
  await expect(page.getByRole("dialog")).not.toContainText(/\d+%/);
  expect(submitted).toMatchObject({
    inputMethod: "youtube",
    youtubeUrl: "https://www.youtube.com/watch?v=WvUSs6yTltE",
    includeInLibrary: true,
    addToKnowledgeBase: true,
    presentationPreset: "auto",
  });

  releaseGeneration?.();
  await expect(page).toHaveURL(/\/guide-editor\/314\?new=1$/);
});

test("Guide generation errors retain the entered source and explain the retry path", async ({ page }) => {
  await page.route("**/api/guides", (route) => route.fulfill({
    status: 422,
    contentType: "application/json",
    body: JSON.stringify({ message: "YouTube could not provide a transcript for this video." }),
  }));

  await page.goto(`${appOrigin}/create/guide`);
  const source = page.getByLabel("YouTube video URL");
  await source.fill("https://www.youtube.com/watch?v=no-transcript");
  await page.getByRole("button", { name: "Generate Practice Guide" }).click();

  await expect(page.getByRole("alert")).toContainText("YouTube could not provide a transcript");
  await expect(page.getByRole("alert")).toContainText("Your source and settings are still here");
  await expect(source).toHaveValue("https://www.youtube.com/watch?v=no-transcript");
});

test("Review and publish saves the current Guide before changing its status", async ({ page }) => {
  const richContent = {
    schemaVersion: 2,
    title: "Mid-Range Mastery",
    promise: "Build a repeatable pull-up jumper.",
    sections: [
      {
        id: "section_1",
        title: "Load the hips",
        content: "Stay balanced before the rise.",
        timestamp: "0:42",
        timestampSeconds: 42,
        blocks: [
          { type: "rich_text", text: "Stay balanced before the rise." },
          { type: "checklist", items: ["Chest tall", "Hips loaded"] },
        ],
      },
    ],
    callToAction: "Complete the workout sheet.",
  };
  const initialGuide = {
    id: 314,
    userId: "creator-1",
    brandId: 16,
    magnetType: "guide",
    title: "Mid-Range Mastery",
    description: "Turn one dribble into a balanced pull-up.",
    content: richContent,
    youtubeVideoId: "WvUSs6yTltE",
    ctaText: "Start training",
    ctaLink: "https://example.com/training",
    includeInLibrary: true,
    status: "draft",
  };
  const requestOrder: string[] = [];
  let savedPayload: Record<string, unknown> | undefined;
  let releaseSave: (() => void) | undefined;
  const saveHeld = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });

  await page.route("**/api/guides/314", async (route) => {
    if (route.request().method() === "PUT") {
      requestOrder.push("save:start");
      savedPayload = route.request().postDataJSON();
      await saveHeld;
      requestOrder.push("save:complete");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...initialGuide, ...savedPayload }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(initialGuide),
    });
  });
  await page.route("**/api/guides/314/status", async (route) => {
    const { status } = route.request().postDataJSON() as { status: string };
    requestOrder.push(status);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        guide: { ...initialGuide, ...savedPayload, status },
        message: `Guide ${status}`,
      }),
    });
  });

  await page.goto(`${appOrigin}/guide-editor/314?new=1`);

  await expect(page.getByText("Review & publish", { exact: true })).toBeVisible();
  await expect(page.getByText(/Drag & Drop Guide|Add Elements|Editing canvas/)).toHaveCount(0);
  await page.getByLabel("Guide title").fill("The Pull-Up Blueprint");
  await page.getByLabel("Short description").fill("Build a balanced pull-up you can trust under pressure.");
  await page.getByLabel("Button text").fill("Get the complete program");
  await page.getByLabel("Destination URL").fill("https://example.com/complete-program");
  await expect(page.getByRole("button", { name: "Improve with AI" })).toBeDisabled();
  await expect(page.getByText(/Save this Draft first so AI improvement cannot replace unsaved/)).toBeVisible();
  await page.getByRole("button", { name: "Save & publish" }).click();

  await expect.poll(() => requestOrder).toEqual(["save:start"]);
  releaseSave?.();
  await expect.poll(() => requestOrder).toEqual(["save:start", "save:complete", "published"]);
  await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Improve with AI" })).toBeEnabled();

  expect(savedPayload).toMatchObject({
    title: "The Pull-Up Blueprint",
    description: "Build a balanced pull-up you can trust under pressure.",
    ctaText: "Get the complete program",
    ctaLink: "https://example.com/complete-program",
    content: {
      ...richContent,
      title: "The Pull-Up Blueprint",
    },
  });

  requestOrder.length = 0;
  await page.getByLabel("Short description").fill("A private revision for the next campaign.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect.poll(() => requestOrder).toEqual(["draft", "save:start", "save:complete"]);
  await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();
  expect(savedPayload).toMatchObject({
    description: "A private revision for the next campaign.",
  });
});

test("a publish failure keeps the saved edits visible and the Guide in Draft", async ({ page }) => {
  const guide = {
    id: 315,
    userId: "creator-1",
    brandId: 16,
    magnetType: "guide",
    title: "First Step",
    description: "Original description",
    content: {
      schemaVersion: 2,
      title: "First Step",
      sections: [],
      callToAction: "Take the next step.",
    },
    ctaText: null,
    ctaLink: null,
    includeInLibrary: false,
    status: "draft",
  };

  await page.route("**/api/guides/315", async (route) => {
    if (route.request().method() === "PUT") {
      const update = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...guide, ...update }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(guide),
    });
  });
  await page.route("**/api/guides/315/status", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ message: "Publishing is temporarily unavailable." }),
  }));

  await page.goto(`${appOrigin}/guide-editor/315`);
  await page.getByLabel("Guide title").fill("A Better First Step");
  await page.getByRole("button", { name: "Save & publish" }).click();

  await expect(page.getByText("Saved as Draft; publish failed", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Guide title")).toHaveValue("A Better First Step");
  await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();
});
