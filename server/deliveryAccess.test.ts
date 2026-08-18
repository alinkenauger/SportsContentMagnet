import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createDeliveryAccessToken,
  verifyDeliveryAccessToken,
  type DeliveryAccessBinding,
} from "./deliveryAccess";

const secret = "test-session-secret-with-enough-entropy";
const binding: DeliveryAccessBinding = {
  customUrl: "mid-range-mastery",
  guideId: 101,
  leadId: 202,
};

test("delivery access tokens are deterministic, URL-safe, and bound to every delivery identifier", () => {
  const token = createDeliveryAccessToken(binding, secret);

  assert.match(token, /^v1\.[A-Za-z0-9_-]{43}$/);
  assert.equal(createDeliveryAccessToken(binding, secret), token);
  assert.equal(verifyDeliveryAccessToken(token, binding, secret), true);
  assert.equal(verifyDeliveryAccessToken(token, { ...binding, customUrl: "another-guide" }, secret), false);
  assert.equal(verifyDeliveryAccessToken(token, { ...binding, guideId: 102 }, secret), false);
  assert.equal(verifyDeliveryAccessToken(token, { ...binding, leadId: 203 }, secret), false);
  assert.equal(verifyDeliveryAccessToken(token, binding, "another-session-secret"), false);
});

test("delivery access verification fails closed for unsigned and malformed values", () => {
  const token = createDeliveryAccessToken(binding, secret);
  const replacement = token.endsWith("A") ? "B" : "A";
  const tampered = token.slice(0, -1) + replacement;

  for (const candidate of [undefined, null, "", "v1", "v2.invalid", "v1.not-base64!", tampered]) {
    assert.equal(verifyDeliveryAccessToken(candidate, binding, secret), false);
  }
});

test("delivery routes issue and require signed access without loading every Guide lead", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const storage = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
  const client = readFileSync(new URL("../client/src/pages/guide-delivery.tsx", import.meta.url), "utf8");
  const helper = readFileSync(new URL("./deliveryAccess.ts", import.meta.url), "utf8");

  const submitStart = routes.indexOf("app.post('/api/landing/:customUrl/submit'");
  const deliveryStart = routes.indexOf("app.get('/api/delivery/:customUrl/:leadId'");
  const deliveryEnd = routes.indexOf("// Public guide view route", deliveryStart);
  const limiterStart = routes.indexOf("const publicDeliveryReadRateLimit = createRateLimit");
  const limiterEnd = routes.indexOf("const publicGuideViewRateLimit", limiterStart);
  assert.ok(submitStart >= 0 && deliveryStart > submitStart && deliveryEnd > deliveryStart);
  assert.ok(limiterStart >= 0 && limiterEnd > limiterStart);

  const submitRoute = routes.slice(submitStart, deliveryStart);
  const deliveryRoute = routes.slice(deliveryStart, deliveryEnd);
  const deliveryLimiter = routes.slice(limiterStart, limiterEnd);
  assert.match(submitRoute, /createDeliveryAccessToken\(\{/);
  assert.match(submitRoute, /\?access=\$\{encodeURIComponent\(deliveryAccessToken\)\}/);
  assert.match(submitRoute, /guideDeliveryUrl[\s\S]*deliveryPath/);
  assert.match(submitRoute, /deliveryUrl: deliveryPath/);

  assert.match(deliveryRoute, /publicDeliveryReadRateLimit/);
  assert.match(deliveryRoute, /publicLandingSlugSchema\.safeParse\(req\.params\.customUrl\)/);
  assert.match(deliveryRoute, /positiveRouteIdSchema\.safeParse\(req\.params\.leadId\)/);
  assert.match(deliveryRoute, /verifyDeliveryAccessToken\(req\.query\.access/);
  assert.match(deliveryRoute, /storage\.getLead\(leadId\)/);
  assert.match(deliveryRoute, /lead\.guideId !== guide\.id/);
  assert.match(deliveryRoute, /lead\.landingPageId !== landingPage\.id/);
  assert.doesNotMatch(deliveryRoute, /getLeadsByGuide/);
  assert.doesNotMatch(deliveryRoute, /lead:\s*\{\s*id: lead\.id/);
  assert.ok(deliveryRoute.indexOf("verifyDeliveryAccessToken") < deliveryRoute.indexOf("storage.getLead"));
  assert.match(deliveryLimiter, /max: 60/);
  assert.match(deliveryLimiter, /createIpResourceRateKey\("customUrl"\)/);

  assert.match(storage, /getLead\(id: number\): Promise<Lead \| undefined>/);
  assert.match(storage, /async getLead\(id: number\)[\s\S]*eq\(leads\.id, id\)/);
  assert.match(client, /new URLSearchParams\(search\)\.get\("access"\)/);
  assert.match(client, /\?access=\$\{encodeURIComponent\(accessToken\)\}/);
  assert.match(helper, /createHmac\("sha256"/);
  assert.match(helper, /timingSafeEqual\(expected, comparable\)/);
  assert.match(helper, /toString\("base64url"\)/);
});
