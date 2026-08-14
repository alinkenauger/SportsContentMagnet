import assert from "node:assert/strict";
import test from "node:test";

import { safeHttpUrl, safePublicAssetUrl } from "../client/src/lib/safe-url";

const previousWindow = (globalThis as any).window;
(globalThis as any).window = { location: { origin: "https://vidmagnet.example" } };

test.after(() => {
  if (previousWindow === undefined) delete (globalThis as any).window;
  else (globalThis as any).window = previousWindow;
});

test("safe HTTP URLs allow web destinations and reject executable protocols", () => {
  assert.equal(safeHttpUrl("/privacy"), "https://vidmagnet.example/privacy");
  assert.equal(safeHttpUrl("https://example.com/resource"), "https://example.com/resource");
  assert.equal(safeHttpUrl("javascript:alert(1)"), undefined);
  assert.equal(safeHttpUrl("data:text/html,unsafe"), undefined);
  assert.equal(safeHttpUrl(undefined), undefined);
});

test("public brand assets allow only the dedicated same-origin upload path", () => {
  assert.equal(safePublicAssetUrl("/uploads/branding/logo.png"), "/uploads/branding/logo.png");
  assert.equal(
    safePublicAssetUrl("https://vidmagnet.example/uploads/branding/logo.png"),
    "https://vidmagnet.example/uploads/branding/logo.png",
  );
  assert.equal(safePublicAssetUrl("/api/auth/logout"), undefined);
  assert.equal(safePublicAssetUrl("/uploads/branding/../private.txt"), undefined);
  assert.equal(safePublicAssetUrl("//attacker.example/logo.png"), undefined);
  assert.equal(
    safePublicAssetUrl("https://vidmagnet.example/uploads/branding/logo.png?token=secret"),
    undefined,
  );
});

test("public brand assets preserve explicitly external HTTP CDN URLs", () => {
  assert.equal(
    safePublicAssetUrl("https://cdn.example.com/brand/logo.png"),
    "https://cdn.example.com/brand/logo.png",
  );
  assert.equal(safePublicAssetUrl("ftp://cdn.example.com/brand/logo.png"), undefined);
});
