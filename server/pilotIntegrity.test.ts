import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storage = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const quizStorage = readFileSync(new URL("./quizStorage.ts", import.meta.url), "utf8");
const sidebar = readFileSync(new URL("../client/src/components/sidebar.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
const revisionMigration = readFileSync(
  new URL("../migrations/0006_guide_revision.sql", import.meta.url),
  "utf8",
);

test("shared-brand dashboard data includes collaborators while personal data stays owner-scoped", () => {
  assert.match(
    storage,
    /brandId === null[\s\S]*?eq\(leads\.userId, userId\), isNull\(guides\.brandId\)[\s\S]*?: \[eq\(guides\.brandId, brandId\)\]/,
  );
  assert.match(
    storage,
    /brandId === undefined[\s\S]*?eq\(guides\.userId, userId\)[\s\S]*?brandId === null[\s\S]*?eq\(guides\.brandId, brandId\)/,
  );
  assert.match(routes, /resolveCurrentBrandScope\(userId, "read"\)[\s\S]*getAnalyticsByUser\(userId, scope\.brandId\)/);
  assert.match(routes, /resolveCurrentBrandScope\(userId, "read"\)[\s\S]*getLeadsByUserAndBrand\(userId, scope\.brandId\)/);
});

test("Guide writes and transfers advance an exact revision token", () => {
  assert.match(revisionMigration, /ADD COLUMN IF NOT EXISTS revision integer/);
  assert.match(revisionMigration, /ALTER COLUMN revision SET NOT NULL/);
  assert.match(storage, /eq\(guides\.revision, expectedRevision\)/);
  assert.match(storage, /revision: sql`\$\{guides\.revision\} \+ 1`/);
  assert.ok(
    (routes.match(/revision: sql`\$\{guides\.revision\} \+ 1`/g) || []).length >= 2,
    "both transfer paths must invalidate an in-flight publish revision",
  );
});

test("long-running and Library Guide mutations reject a stale revision", () => {
  const routeSource = (signature: string) => {
    const start = routes.indexOf(signature);
    assert.notEqual(start, -1, `missing route ${signature}`);
    const next = routes.indexOf("\n  app.", start + signature.length);
    return routes.slice(start, next === -1 ? routes.length : next);
  };

  for (const signature of [
    "app.post('/api/guides/:id/regenerate-screenshots'",
    "app.patch('/api/guides/:id/library'",
    "app.post('/api/guides/:id/regenerate'",
  ]) {
    const mutationRoute = routeSource(signature);
    assert.match(
      mutationRoute,
      /updateGuideIfUnchanged\(guideId, guide\.revision/,
      `${signature} must compare the revision read during authorization`,
    );
    assert.match(mutationRoute, /status\(409\)/, `${signature} must surface a stale-write conflict`);
  }
});

test("Interactive Quiz save and publish use the parent Guide revision as a CAS token", () => {
  assert.ok(
    (quizStorage.match(/eq\(guides\.revision, bundle\.guide\.revision\)/g) || []).length >= 2,
    "both Quiz update and publish must compare the validated parent revision",
  );
  assert.ok(
    (quizStorage.match(/revision: sql`\$\{guides\.revision\} \+ 1`/g) || []).length >= 2,
    "both Quiz update and publish must advance the revision",
  );
  assert.ok(
    (quizStorage.match(/throw new QuizStorageError\([\s\S]*?409/g) || []).length >= 2,
    "stale Quiz mutations must fail with a conflict",
  );
});

test("the shared Sidebar uses real workspaces and protected deep links return to login", () => {
  assert.doesNotMatch(sidebar, /adamLinkenauger@gmail\.com|adminBrands|AthleticMotion Golf/);
  assert.match(sidebar, /const displayBrands = brands/);
  assert.match(sidebar, /window\.location\.href = "\/api\/logout"/);
  assert.match(app, /function ProtectedRouteRedirect\(\)/);
  assert.match(app, /\/login\?returnTo=/);
  assert.match(app, /<Route component=\{ProtectedRouteRedirect\}/);
});
