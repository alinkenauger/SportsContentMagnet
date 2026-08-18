import assert from "node:assert/strict";
import test from "node:test";

import {
  contrastRatio,
  ensureReadableTextColor,
} from "../client/src/lib/color-contrast";

test("public output text falls back when brand colors are unreadable", () => {
  assert.equal(ensureReadableTextColor("#FFFFFF", "#FFFFFF"), "#101419");
  assert.equal(ensureReadableTextColor("#111111", "#101419"), "#FFFFFF");
  assert.equal(ensureReadableTextColor("#102A43", "#FFFFFF"), "#102A43");
  assert.ok(contrastRatio("#102A43", "#FFFFFF") >= 4.5);
});
