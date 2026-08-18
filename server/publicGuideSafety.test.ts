import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test";

const {
  createIpResourceRateKey,
  landingSubmissionIssues,
  publicGuideIdSchema,
  publicLandingSlugSchema,
  publicLeadSubmissionSchema,
} = await import("./publicGuideSafety");

test("public Guide and landing identifiers reject ambiguous route values", () => {
  assert.equal(publicGuideIdSchema.parse("101"), 101);
  assert.equal(publicGuideIdSchema.safeParse("101junk").success, false);
  assert.equal(publicGuideIdSchema.safeParse("0").success, false);
  assert.equal(publicLandingSlugSchema.parse("follow-through_101"), "follow-through_101");
  assert.equal(publicLandingSlugSchema.safeParse("../admin").success, false);
});

test("lead submissions are strict, normalized, and bounded", () => {
  const parsed = publicLeadSubmissionSchema.parse({
    email: " Player@Example.COM ",
    firstName: " Jordan ",
    smsConsent: "true",
    customFieldData: { experience: "Varsity" },
  });
  assert.equal(parsed.email, "player@example.com");
  assert.equal(parsed.firstName, "Jordan");
  assert.equal(parsed.smsConsent, true);

  assert.equal(publicLeadSubmissionSchema.safeParse({
    email: "player@example.com",
    unexpected: "field",
  }).success, false);
  assert.equal(publicLeadSubmissionSchema.safeParse({
    email: "not-an-email",
  }).success, false);
  assert.equal(publicLeadSubmissionSchema.safeParse({
    email: "player@example.com",
    customFieldData: Object.fromEntries(
      Array.from({ length: 21 }, (_, index) => [`field${index}`, "value"]),
    ),
  }).success, false);
  assert.equal(publicLeadSubmissionSchema.safeParse({
    email: "player@example.com",
    customFieldData: JSON.parse('{"__proto__":"unsafe"}'),
  }).success, false);
});

test("landing-specific fields reject unknown keys and enforce required values", () => {
  const submission = publicLeadSubmissionSchema.parse({
    email: "player@example.com",
    customFieldData: { level: "" },
  });
  const issues = landingSubmissionIssues([
    { name: "email", required: true },
    { name: "firstName", required: true },
    { name: "level", required: true },
  ], submission);
  assert.deepEqual(issues, [
    "Missing required field: firstName",
    "Missing required field: level",
  ]);

  const unknown = publicLeadSubmissionSchema.parse({
    email: "player@example.com",
    customFieldData: { source: "bot" },
  });
  assert.deepEqual(
    landingSubmissionIssues([{ name: "email", required: true }], unknown),
    ["Unknown custom field: source"],
  );
});

test("rate-limit identity includes both the client IP and requested magnet", () => {
  const key = createIpResourceRateKey("customUrl");
  const first = key({
    ip: "198.51.100.10",
    socket: {},
    params: { customUrl: "guide-one" },
  } as any);
  const secondMagnet = key({
    ip: "198.51.100.10",
    socket: {},
    params: { customUrl: "guide-two" },
  } as any);
  const secondIp = key({
    ip: "198.51.100.11",
    socket: {},
    params: { customUrl: "guide-one" },
  } as any);
  assert.equal(first, "198.51.100.10:guide-one");
  assert.notEqual(first, secondMagnet);
  assert.notEqual(first, secondIp);
});

test("public route wiring applies throttles before handlers and uses atomic dedupe", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const safety = readFileSync(new URL("./publicGuideSafety.ts", import.meta.url), "utf8");

  assert.match(routes, /app\.get\('\/api\/landing\/:customUrl', publicLandingReadRateLimit,/);
  assert.match(routes, /app\.post\('\/api\/landing\/:customUrl\/submit', publicLandingSubmitRateLimit,/);
  assert.match(routes, /app\.post\('\/api\/guides\/:id\/view', publicGuideViewRateLimit,/);
  assert.match(routes, /publicLeadSubmissionSchema\.safeParse\(req\.body\)/);
  assert.match(safety, /db\.transaction\(async \(tx\)/);
  assert.match(safety, /pg_advisory_xact_lock/);
  assert.match(safety, /COALESCE\(\$\{guides\.views\}, 0\) \+ 1/);
  assert.match(safety, /PUBLIC_VIEW_DEDUPLICATION_MS/);
});
