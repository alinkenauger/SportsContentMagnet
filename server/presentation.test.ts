import assert from "node:assert/strict";
import test from "node:test";

import {
  createPresentationProfile,
  formatSourceTime,
  normalizePresentationProfile,
  parseYouTubeSource,
  resolvePresentationPreset,
  youtubeSourceFromStoredFields,
} from "../shared/presentation";

test("YouTube parsing accepts canonical provider routes and normalizes them", () => {
  for (const value of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=45s",
    "https://youtu.be/dQw4w9WgXcQ?si=tracking",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  ]) {
    assert.deepEqual(parseYouTubeSource(value), {
      provider: "youtube",
      videoId: "dQw4w9WgXcQ",
      canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
  }
});

test("YouTube parsing rejects arbitrary hosts and malformed video IDs", () => {
  assert.equal(parseYouTubeSource("https://example.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(parseYouTubeSource("https://youtube.com/watch?v=short"), null);
  assert.equal(parseYouTubeSource("javascript:alert(1)"), null);
  assert.equal(parseYouTubeSource("https://youtube.com:8443/watch?v=dQw4w9WgXcQ"), null);
});

test("stored video IDs are accepted only when they match YouTube's ID grammar", () => {
  assert.equal(youtubeSourceFromStoredFields(null, "abc123"), null);
  assert.equal(
    youtubeSourceFromStoredFields(null, "dQw4w9WgXcQ", "Coach Example")?.channelTitle,
    "Coach Example",
  );
});

test("presentation inference uses explicit overrides before deterministic subject signals", () => {
  assert.equal(resolvePresentationPreset({ preferred: "golf", title: "Basketball handles" }), "golf");
  assert.equal(resolvePresentationPreset({ title: "Build a quicker basketball release" }), "basketball");
  assert.equal(resolvePresentationPreset({ audience: "Mid-handicap golfers" }), "golf");
  assert.equal(resolvePresentationPreset({ title: "Athlete speed session" }), "performance");
  assert.equal(resolvePresentationPreset({ title: "A useful operating playbook" }), "editorial");
});

test("presentation profiles preserve manual choice and fail closed to editorial", () => {
  assert.deepEqual(
    createPresentationProfile(
      { mode: "manual", preset: "golf" },
      { title: "Basketball release training" },
    ),
    { version: 1, mode: "manual", preset: "golf" },
  );
  assert.deepEqual(normalizePresentationProfile({ preset: "basketball" }), {
    version: 1,
    mode: "auto",
    preset: "editorial",
  });
});

test("source times remain compact and human readable", () => {
  assert.equal(formatSourceTime(134.9), "2:14");
  assert.equal(formatSourceTime(3_723), "1:02:03");
});
