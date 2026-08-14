import { expect, test, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ authenticated: false, user: null }),
  }));
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) || [], "browser console and runtime stay clean").toEqual([]);
});

test("emailed account completion consumes a fragment token without leaking it", async ({ page }) => {
  const token = "a".repeat(64);
  let proofBody: Record<string, unknown> | undefined;
  let completionBody: Record<string, unknown> | undefined;
  await page.route("**/api/auth/pending-signup", async (route) => {
    proofBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ready: true, proof: "email" }),
    });
  });
  await page.route("**/api/auth/complete-account", async (route) => {
    completionBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Account setup complete",
        authenticated: true,
        emailVerified: true,
        redirect: "/dashboard",
      }),
    });
  });

  await page.goto(`/complete-account#token=${token}`);
  await expect(page.getByText("Create your password", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/complete-account$/);
  expect(proofBody).toEqual({ token });

  await page.getByLabel("Password", { exact: true }).fill("correct horse battery staple");
  await page.getByLabel("Confirm password").fill("correct horse battery staple");
  await page.getByRole("button", { name: "Finish account setup" }).click();

  await page.waitForURL("**/dashboard");
  expect(completionBody).toEqual({ password: "correct horse battery staple", token });
  expect(page.url()).not.toContain(token);
});

test("account completion exposes a recoverable sign-in path after session persistence fails", async ({ page }) => {
  await page.route("**/api/auth/pending-signup", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ready: true, proof: "session" }),
  }));
  await page.route("**/api/auth/complete-account", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({
      code: "ACCOUNT_COMPLETED_SIGN_IN_REQUIRED",
      message: "Your account was completed, but we could not sign you in.",
      redirect: "/login",
    }),
  }));

  await page.goto("/complete-account");
  await page.getByLabel("Password", { exact: true }).fill("long enough password");
  await page.getByLabel("Confirm password").fill("long enough password");
  await page.getByRole("button", { name: "Finish account setup" }).click();

  await expect(page.getByRole("alert")).toContainText("could not sign you in");
  await expect(page.getByRole("link", { name: "Sign in to continue" })).toHaveAttribute("href", "/login");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Confirm password")).toHaveValue("");
  browserErrors.set(page, (browserErrors.get(page) || []).filter((message) => !message.includes("status of 503")));
});

test("a public quiz completes the question, lead, result, gift, and CTA journey", async ({ page }) => {
  const attemptId = "00000000-0000-4000-8000-000000000001";
  let completionBody: Record<string, unknown> | undefined;
  await page.route("**/api/public/quizzes/follow-through", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        guide: { title: "What breaks follow-through?", description: "Find your next useful move." },
        landingPage: { customUrl: "follow-through" },
        quiz: {
          questions: [
            {
              id: "focus",
              prompt: "What happens after the call?",
              required: true,
              options: [
                { id: "too_many", label: "Everything feels equally important." },
                { id: "one_move", label: "One move is clear." },
              ],
            },
            {
              id: "proof",
              prompt: "How is completion verified?",
              required: true,
              options: [
                { id: "invisible", label: "There is no visible proof." },
                { id: "visible", label: "The proof is obvious." },
              ],
            },
          ],
          leadCapture: {
            enabled: true,
            required: true,
            headline: "Reveal your result",
            fields: ["firstName", "email"],
          },
          theme: {
            primaryColor: "#101419",
            secondaryColor: "#158A63",
            backgroundColor: "#F4EFE6",
            fontFamily: "DM Sans",
          },
        },
        branding: { companyName: "Northstar Coaching" },
      }),
    });
  });
  await page.route("**/api/public/quizzes/follow-through/start", (route) => route.fulfill({
    status: 201,
    contentType: "application/json",
    body: JSON.stringify({ attemptId }),
  }));
  await page.route("**/api/public/quizzes/follow-through/complete", async (route) => {
    completionBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        attemptId,
        outcome: {
          id: "priority_pile_up",
          title: "The Priority Pile-Up",
          summary: "Your plan needs one visible next move.",
          description: "Reduce the active plan to one commitment.",
          recommendations: ["Choose one action", "Schedule it"],
        },
        gift: {
          title: "Weekly Reset Sheet",
          benefitSummary: "Turn a priority into a visible commitment.",
          url: "https://example.com/reset",
          buttonLabel: "Get the reset sheet",
        },
        cta: {
          title: "Build your follow-through system",
          benefitSummary: "Create a reliable next-action rhythm.",
          url: "https://example.com/system",
          buttonLabel: "Build the system",
        },
      }),
    });
  });

  await page.goto("/quiz/follow-through");
  await page.getByRole("button", { name: "Start the quiz" }).click();
  await page.locator("label").filter({ hasText: "Everything feels equally important." }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.locator("label").filter({ hasText: "There is no visible proof." }).click();
  await page.getByRole("button", { name: "See my result" }).click();
  await page.getByLabel("First name").fill("Jordan");
  await page.getByLabel("Email address").fill("jordan@example.com");
  await page.getByRole("button", { name: "Reveal my result" }).click();

  await expect(page.getByRole("heading", { name: "The Priority Pile-Up" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Get the reset sheet" })).toHaveAttribute("href", "https://example.com/reset");
  await expect(page.getByRole("link", { name: "Build the system" })).toHaveAttribute("href", "https://example.com/system");
  expect(completionBody).toEqual({
    attemptId,
    answers: { focus: "too_many", proof: "invisible" },
    firstName: "Jordan",
    email: "jordan@example.com",
  });
  await expect(page).toHaveURL(new RegExp(`attemptId=${attemptId}`));
});

test("a public quiz gives a retryable error when starting fails", async ({ page }) => {
  await page.route("**/api/public/quizzes/unavailable", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      guide: { title: "Available quiz", description: "The quiz itself loaded." },
      quiz: { questions: [], leadCapture: false },
    }),
  }));
  await page.route("**/api/public/quizzes/unavailable/start", (route) => route.fulfill({
    status: 429,
    contentType: "application/json",
    body: JSON.stringify({ message: "Too many quiz attempts. Please try again later." }),
  }));

  await page.goto("/quiz/unavailable");
  await page.getByRole("button", { name: "Start the quiz" }).click();
  await expect(page.getByText(/Too many quiz attempts/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Start the quiz" })).toBeEnabled();
  browserErrors.set(page, (browserErrors.get(page) || []).filter((message) => !message.includes("status of 429")));
});

test("an authenticated creator can choose Quiz, submit a grounded brief, and reach the editor", async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      authenticated: true,
      user: { id: "user-a", email: "creator@example.com", currentBrandId: null },
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
  await page.route("**/api/benefit-assets?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: "[]",
  }));
  await page.route("**/api/quizzes/91", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      guide: {
        id: 91,
        title: "Follow-through diagnostic",
        description: "Find the point where action breaks.",
        status: "draft",
        brandId: null,
      },
      landingPage: { customUrl: "follow-through" },
      quiz: {
        questions: [],
        outcomes: [],
        leadCapture: { enabled: true, required: true, headline: "Reveal your result" },
        theme: {},
        themeMode: "brand",
      },
    }),
  }));

  let generationBody: Record<string, unknown> | undefined;
  await page.route("**/api/quizzes/generate", async (route) => {
    generationBody = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ guide: { id: 91, title: "Follow-through diagnostic" }, quiz: {}, landingPage: {} }),
    });
  });

  await page.goto("/create");
  await expect(page.getByRole("heading", { name: "What do you want to create?" })).toBeVisible();
  await page.getByRole("button", { name: /Interactive Quiz/ }).click();
  await page.getByLabel("Quiz title").fill("  Follow-through diagnostic  ");
  await page.getByRole("textbox", { name: "Content", exact: true }).fill(
    "End every coaching call with one priority, schedule the action, and define visible proof before the conversation ends.",
  );
  await page.getByLabel("Who is this for?").fill("  Coaches with active clients  ");
  await page.getByLabel("What should the quiz reveal?").fill("  Where follow-through breaks  ");
  await page.getByRole("button", { name: "Generate interactive quiz" }).click();

  await page.waitForURL("**/quiz-editor/91");
  expect(generationBody).toMatchObject({
    title: "Follow-through diagnostic",
    audience: "Coaches with active clients",
    objective: "Where follow-through breaks",
    questionCount: 6,
    outcomeCount: 3,
  });
});
