import { expect, test, type Page, type Route } from "@playwright/test";

const unauthenticatedResponse = {
  authenticated: false,
  user: null,
};

const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) || [], "browser console and runtime stay clean").toEqual([]);
});

function acknowledgeExpectedHttpError(page: Page, status: number) {
  const errors = browserErrors.get(page) || [];
  const expected = errors.filter((message) => message.includes(`status of ${status}`));
  expect(expected, `browser reported the intentionally mocked ${status} response`).toHaveLength(1);
  browserErrors.set(page, errors.filter((message) => !message.includes(`status of ${status}`)));
}

async function openSalesPage(page: Page) {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(unauthenticatedResponse) });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function fillSignup(page: Page) {
  await page.getByLabel("First name").fill("Jordan");
  await page.getByLabel("Last name").fill("Taylor");
  await page.getByLabel("Email address").fill("jordan@example.com");
}

async function openHeroSignup(page: Page) {
  await page.locator('[data-cta-placement="hero"]').click();
  await expect(page.getByRole("dialog", { name: "Build your first magnet" })).toBeVisible();
}

test.describe("VidMagnet sales page", () => {
  test("explains the product with the five approved buyer questions", async ({ page }, testInfo) => {
    await openSalesPage(page);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Turn content you already trust into a lead magnet people can actually use.",
    );
    for (const heading of [
      "Teach the next move—or diagnose where to start.",
      "Give them something worth the email.",
      "From opt-in to next step, without losing your brand.",
      "Your next lead magnet may already be in your content.",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }

    await expect(page.getByText("Example output using synthetic source content")).toBeVisible();
    await expect(page.locator("[data-cta-placement]"), "all four CTA placements remain stable").toHaveCount(4);
    await expect(page.locator("body")).not.toContainText(/PDF upload|web-page URL|streaming URL/i);
    await page.screenshot({ path: testInfo.outputPath("sales-page-full.png"), fullPage: true });
  });

  test("uses one keyboard-operable Guide and Outcome Quiz proof", async ({ page }) => {
    await openSalesPage(page);

    const guideTab = page.getByRole("tab", { name: "Guide" });
    const quizTab = page.getByRole("tab", { name: "Outcome Quiz" });
    await expect(page.getByRole("tablist", { name: "Choose an example output" })).toHaveCount(1);
    await expect(guideTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toContainText("The Client Follow-Through Playbook");

    await guideTab.focus();
    await page.keyboard.press("ArrowRight");
    await expect(quizTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toContainText("The Priority Pile-Up");

    await page.keyboard.press("Home");
    await expect(guideTab).toHaveAttribute("aria-selected", "true");
  });

  test("honors reduced motion when the artifact changes", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openSalesPage(page);

    await page.getByRole("tab", { name: "Outcome Quiz" }).click();
    const animationName = await page.getByRole("tabpanel").locator("> div").evaluate(
      (element) => getComputedStyle(element).animationName,
    );
    expect(animationName).toBe("none");
  });

  test("keeps the mobile page inside the viewport and simplifies navigation", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "mobile project only");
    await openSalesPage(page);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator('[data-cta-placement="nav"]')).toBeVisible();
    await expect(page.locator("#cta-nav-login")).toBeHidden();
  });

  test("shows field errors without sending an invalid signup", async ({ page }) => {
    let requests = 0;
    await page.route("**/api/auth/signup", async (route) => {
      requests += 1;
      await route.abort();
    });
    await openSalesPage(page);
    await openHeroSignup(page);
    await page.getByRole("button", { name: "Create free account" }).click();

    await expect(page.getByText("First name must be at least 2 characters")).toBeVisible();
    await expect(page.getByText("Last name must be at least 2 characters")).toBeVisible();
    await expect(page.getByText("Please enter a valid email address")).toBeVisible();
    expect(requests).toBe(0);
  });

  test("continues a new signup without putting PII in the URL or storage", async ({ page }) => {
    let signupBody: Record<string, unknown> | undefined;
    await page.route("**/api/auth/signup", async (route) => {
      signupBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ message: "Account created", nextStep: "completeAccount", resumed: false }),
      });
    });
    await page.route("**/api/auth/pending-signup", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ready: true, proof: "session" }),
      });
    });
    await openSalesPage(page);
    await openHeroSignup(page);
    await fillSignup(page);
    await page.getByRole("button", { name: "Create free account" }).click();

    await page.waitForURL("**/complete-account");
    expect(page.url()).not.toContain("jordan");
    expect(page.url()).not.toContain("example.com");
    expect(signupBody).toMatchObject({ firstName: "Jordan", lastName: "Taylor", email: "jordan@example.com" });
    const leakedStorage = await page.evaluate(() =>
      [...Object.entries(localStorage), ...Object.entries(sessionStorage)].some(([, value]) =>
        /jordan|example\.com/i.test(String(value)),
      ),
    );
    expect(leakedStorage).toBe(false);
  });

  test("keeps emailed-recovery and existing-account states visible", async ({ page }) => {
    let signupResponse = {
      status: 202,
      body: { message: "Check your email", nextStep: "checkEmail", resumed: false },
    };
    await page.route("**/api/auth/signup", async (route) => {
      await route.fulfill({
        status: signupResponse.status,
        contentType: "application/json",
        body: JSON.stringify(signupResponse.body),
      });
    });
    await openSalesPage(page);
    await openHeroSignup(page);
    await fillSignup(page);
    await page.getByRole("button", { name: "Create free account" }).click();
    await expect(page.getByRole("status")).toContainText("Check your email to continue");
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole("button", { name: "Done" }).click();
    signupResponse = {
      status: 409,
      body: { message: "Account already exists", nextStep: "signIn", resumed: false },
    };
    await openHeroSignup(page);
    await fillSignup(page);
    await page.getByRole("button", { name: "Create free account" }).click();
    await expect(page.getByRole("alert")).toContainText("Sign in to continue");
    await expect(page.getByRole("link", { name: "Sign in instead" })).toHaveAttribute("href", "/login");
    acknowledgeExpectedHttpError(page, 409);
  });

  test("retains values after a retryable signup error", async ({ page }) => {
    await page.route("**/api/auth/signup", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "RECOVERY_EMAIL_UNAVAILABLE", message: "Try again" }),
      });
    });
    await openSalesPage(page);
    await openHeroSignup(page);
    await fillSignup(page);
    await page.getByRole("button", { name: "Create free account" }).click();

    await expect(page.getByRole("alert")).toContainText("try again");
    await expect(page.getByLabel("First name")).toHaveValue("Jordan");
    await expect(page.getByLabel("Last name")).toHaveValue("Taylor");
    await expect(page.getByLabel("Email address")).toHaveValue("jordan@example.com");
    acknowledgeExpectedHttpError(page, 503);
  });

  test("does not dismiss the signup dialog while submission is pending", async ({ page }) => {
    let releaseRequest: (() => void) | undefined;
    const requestGate = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    await page.route("**/api/auth/signup", async (route: Route) => {
      await requestGate;
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ message: "Check email", nextStep: "checkEmail", resumed: false }),
      });
    });
    await openSalesPage(page);
    await openHeroSignup(page);
    await fillSignup(page);
    await page.getByRole("button", { name: "Create free account" }).click();
    await expect(page.getByRole("button", { name: "Creating your account…" })).toBeDisabled();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Build your first magnet" })).toBeVisible();
    releaseRequest?.();
    await expect(page.getByRole("status")).toContainText("Check your email to continue");
  });

  test("returns focus to the exact signup CTA after the dialog closes", async ({ page }) => {
    await openSalesPage(page);
    const heroCta = page.locator("#cta-hero-start-free");
    await heroCta.click();
    await expect(page.getByLabel("First name")).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Build your first magnet" })).toHaveCount(0);
    await expect(heroCta).toBeFocused();
  });
});
