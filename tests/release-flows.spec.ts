import { expect, test, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "the recipient experience does not overflow horizontally").toBeLessThanOrEqual(1);
}

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
          prescription: {
            strengths: [
              "You can recognize when too many priorities are competing.",
              "You are ready to make completion visible.",
            ],
            bottleneck: "Every task is competing for attention, so no single commitment becomes the obvious next move.",
            opportunity: "A one-priority reset can turn scattered intent into a visible commitment this week.",
            watchout: "Do not turn the reset into another long planning exercise.",
            quickWin: {
              title: "Choose one visible commitment",
              action: "Write the single action that would make this week feel meaningfully complete.",
              why: "One named commitment removes the competition between equally urgent tasks.",
              timeframe: "10 minutes",
              successCriteria: "The action has an owner, a deadline, and visible proof of completion.",
            },
            nextSteps: [
              {
                title: "Name the finish line",
                action: "Describe the artifact or behavior that will prove the commitment is complete.",
                why: "Visible proof prevents subjective completion.",
                timeframe: "Today",
                successCriteria: "Anyone can tell whether the action is finished.",
              },
              {
                title: "Protect the action",
                action: "Put the action on the calendar before adding another priority.",
                why: "Protected time turns a priority into a commitment.",
                timeframe: "Within 24 hours",
                successCriteria: "A specific calendar block exists for the work.",
              },
            ],
            mistakes: [
              {
                mistake: "Keeping three backup priorities active.",
                correction: "Move every non-primary item to a clearly labeled later list.",
              },
            ],
            implementationAsset: {
              type: "worksheet",
              title: "One-action follow-through worksheet",
              description: "Turn this result into one protected behavior with a visible finish line.",
              instructions: "Fill in each prompt, then keep the completed line where you will see it this week.",
              content: "MY ONE ACTION\n\nThe behavior I will repeat: [write one observable behavior]\nWhere I will use it: [real situation]\nI will know it worked when: [visible finish line]\nMy review date: [date]",
            },
          },
        },
        diagnostic: {
          responsePattern: "You see the work clearly, but competing priorities and invisible proof weaken follow-through.",
          strongestSignal: {
            title: "Priority clarity",
            description: "Your answers show that choosing one move is the highest-leverage change.",
            normalizedScore: 88,
            direction: "high",
            label: "Strong signal",
          },
          dimensions: [
            {
              title: "Priority clarity",
              description: "How clearly one next move stands above the rest.",
              normalizedScore: 88,
              direction: "high",
              label: "Needs immediate focus",
            },
            {
              title: "Visible proof",
              description: "How clearly completion can be verified.",
              normalizedScore: 72,
              direction: "high",
              label: "Needs a finish line",
            },
          ],
          answerEvidence: [
            {
              question: "What happens after the call?",
              answer: "Everything feels equally important.",
              answerInsight: "Competing priorities are preventing a clear first action.",
              evidence: "Follow-through improves when one commitment becomes visibly primary.",
            },
            {
              question: "How is completion verified?",
              answer: "There is no visible proof.",
              answerInsight: "Without a finish line, progress stays subjective.",
              evidence: "A saved artifact or observable behavior makes completion unambiguous.",
            },
          ],
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
  await expect(page.getByRole("heading", { name: "What your answers revealed" })).toBeVisible();
  await expect(page.getByText("Strongest signal", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Priority clarity", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Priority clarity" })).toHaveAttribute("aria-valuenow", "88");
  await expect(page.getByRole("heading", { name: "Why this is your result" })).toBeVisible();
  await page.getByText("What happens after the call?", { exact: true }).click();
  await expect(page.getByText("Your answer: Everything feels equally important.")).toBeVisible();
  await expect(page.getByText("Competing priorities are preventing a clear first action.")).toBeVisible();
  const outcomeHero = page.getByLabel("The Priority Pile-Up");
  await expect(outcomeHero.getByText("Do this first", { exact: true })).toBeVisible();
  await expect(outcomeHero.getByRole("heading", { name: "Choose one visible commitment" })).toBeVisible();
  await expect(page.getByText("Ready-to-use tool", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "One-action follow-through worksheet" })).toBeVisible();
  await expect(page.getByText("Copy tool", { exact: true })).toBeVisible();
  await expect(page.locator("pre").filter({ hasText: "The behavior I will repeat: [write one observable behavior]" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your ordered action plan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Name the finish line" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Get the reset sheet" })).toHaveAttribute("href", "https://example.com/reset");
  await expect(page.getByRole("link", { name: "Build the system" })).toHaveAttribute("href", "https://example.com/system");
  await expect(page.getByText("Why it fits:")).toBeVisible();
  await expect(page.getByText("Why now:")).toBeVisible();
  await expect(page.getByRole("button", { name: "Print or save PDF" })).toBeVisible();
  expect(completionBody).toEqual({
    attemptId,
    answers: { focus: "too_many", proof: "invisible" },
    firstName: "Jordan",
    email: "jordan@example.com",
  });
  await expect(page).toHaveURL(new RegExp(`attemptId=${attemptId}`));
  await expectNoHorizontalOverflow(page);
});

test("a public guide keeps its teaching content visible and saves workbook progress", async ({ page }) => {
  await page.route("**/api/guide/303/public", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      guide: {
        id: 303,
        title: "The One-Move Follow-Through Workbook",
        description: "Turn one priority into visible proof.",
        views: 12,
        content: {
          schemaVersion: 2,
          format: "workbook",
          title: "The One-Move Follow-Through Workbook",
          promise: "Leave with one protected commitment and a finish line anyone can verify.",
          introduction: "Use this workbook to reduce competing priorities and make follow-through visible.",
          quickStart: {
            desiredOutcome: "Choose and protect the most useful next action.",
            timeRequired: "15 minutes",
            prerequisites: ["Your current task list"],
            firstAction: "Circle the one action that matters most.",
          },
          sections: [
            {
              id: "commitment",
              title: "Make the commitment visible",
              content: "A useful commitment has one action and one observable finish line.",
              type: "tip",
              objective: "Turn an intention into a verifiable commitment.",
              drillBreakdown: {
                painPoint: "Competing priorities can hide the action that matters most.",
                technique: "Choose one action and name one observable finish line.",
                keyFocus: "Keep the commitment visible until the proof exists.",
                repetitions: "One protected commitment",
                duration: "15 minutes",
                verbalSteps: [
                  "Choose the one action that matters most.",
                  "Name the proof another person could verify.",
                ],
                tips: ["Keep the commitment in one sentence."],
              },
              blocks: [
                {
                  type: "checklist",
                  title: "Commitment check",
                  items: [
                    {
                      id: "one_move",
                      text: "Define the one visible commitment",
                      why: "One priority removes competition.",
                      evidence: "The commitment is written in one sentence.",
                      required: true,
                    },
                    {
                      id: "finish_line",
                      text: "Name the finish line",
                      why: "Visible proof makes completion objective.",
                      evidence: "Another person can verify completion.",
                      required: true,
                    },
                  ],
                },
                {
                  type: "worksheet",
                  title: "Put it into practice",
                  instructions: "Write the action you will protect this week.",
                  prompts: [
                    {
                      id: "next_action",
                      prompt: "What is the next visible action?",
                      responseType: "long_text",
                      placeholder: "Write one concrete action",
                    },
                    {
                      id: "finish_line_clarity",
                      prompt: "How clear is the finish line?",
                      responseType: "rating",
                    },
                  ],
                },
              ],
            },
          ],
          conclusion: "Keep the commitment visible until the proof exists.",
          callToAction: "Protect the action on your calendar now.",
        },
      },
      branding: {
        companyName: "Northstar Coaching",
        tagline: "Make progress visible",
        primaryColor: "#173F5F",
        secondaryColor: "#158A63",
        accentColor: "#E79B32",
      },
    }),
  }));
  await page.route("**/api/guides/303/view", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true }),
  }));

  await page.goto("/guide/303");
  await expect(page.getByRole("heading", { name: "The One-Move Follow-Through Workbook" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Deep dive", exact: true })).toBeVisible();
  await expect(page.getByText("A useful commitment has one action and one observable finish line.", { exact: true })).toBeVisible();
  const coachBreakdown = page.getByRole("region", { name: "Coach's breakdown" });
  await expect(coachBreakdown).toBeVisible();
  await expect(coachBreakdown.getByText("Competing priorities can hide the action that matters most.", { exact: true })).toBeVisible();
  await expect(coachBreakdown.getByText("Choose one action and name one observable finish line.", { exact: true })).toBeVisible();
  await expect(page.locator(".vidmagnet-guide-content details")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reset progress" })).toHaveCount(0);

  const commitmentItem = page.getByRole("button", { name: /Define the one visible commitment/ });
  await commitmentItem.click();
  await page.getByLabel("What is the next visible action?").fill("Schedule the client recap before noon.");
  const ratingField = page.locator("label").filter({ hasText: "How clear is the finish line?" });
  await ratingField.getByRole("button", { name: "4", exact: true }).click();
  await expect.poll(() => page.evaluate(() =>
    Object.values(window.localStorage).some((value) =>
      value.includes("Schedule the client recap before noon.") && value.includes('"4"'),
    ),
  )).toBe(true);

  await page.reload();
  await expect(page.getByRole("button", { name: /Define the one visible commitment/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("What is the next visible action?")).toHaveValue("Schedule the client recap before noon.");
  await expect(ratingField.getByRole("button", { name: "4", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Print or save PDF" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
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
  await page.getByRole("button", { name: /Paste source content/ }).click();
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
