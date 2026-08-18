import assert from "node:assert/strict";
import test from "node:test";

import {
  createPrivacyEnhancedEmbedUrl,
  createYouTubeWatchUrl,
  formatVideoTimestamp,
  normalizeYouTubeTimestamp,
  parseYouTubeSource,
  parseYouTubeTimestamp,
} from "./youtube-source";

const VIDEO_ID = "dQw4w9WgXcQ";

test("accepts a bare video ID and canonical YouTube watch URL", () => {
  assert.deepEqual(parseYouTubeSource(VIDEO_ID), {
    videoId: VIDEO_ID,
    kind: "video-id",
    canonicalUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    startSeconds: null,
  });

  assert.deepEqual(
    parseYouTubeSource(`https://www.youtube.com/watch?v=${VIDEO_ID}&t=1m30s`),
    {
      videoId: VIDEO_ID,
      kind: "watch",
      canonicalUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}&t=90s`,
      startSeconds: 90,
    },
  );
});

test("accepts only the supported short-link, Shorts, and embed path shapes", () => {
  assert.equal(parseYouTubeSource(`youtu.be/${VIDEO_ID}?t=45`)?.kind, "short-link");
  assert.equal(parseYouTubeSource(`https://youtube.com/shorts/${VIDEO_ID}`)?.kind, "shorts");
  assert.equal(parseYouTubeSource(`https://youtube.com/embed/${VIDEO_ID}?start=12`)?.kind, "embed");
  assert.equal(
    parseYouTubeSource(`https://www.youtube-nocookie.com/embed/${VIDEO_ID}`)?.videoId,
    VIDEO_ID,
  );
});

test("rejects lookalike hosts, arbitrary subdomains, credentials, ports, and unrelated paths", () => {
  const rejectedSources = [
    `https://youtube.com.evil.example/watch?v=${VIDEO_ID}`,
    `https://evil.youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtube.com:444/watch?v=${VIDEO_ID}`,
    `https://user:password@youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtu.be/${VIDEO_ID}/extra`,
    `https://youtube.com/watch/extra?v=${VIDEO_ID}`,
    `https://youtube.com/@creator/${VIDEO_ID}`,
    `https://www.youtube-nocookie.com/watch?v=${VIDEO_ID}`,
    `https://vimeo.com/${VIDEO_ID}`,
    "javascript:alert(1)",
    "not-a-video-id",
  ];

  rejectedSources.forEach((source) => assert.equal(parseYouTubeSource(source), null, source));
});

test("creates only privacy-enhanced iframe URLs from a validated video ID", () => {
  const embedUrl = createPrivacyEnhancedEmbedUrl(VIDEO_ID, {
    autoplay: true,
    controls: false,
    startSeconds: 75.9,
  });

  assert.ok(embedUrl);
  const url = new URL(embedUrl);
  assert.equal(url.origin, "https://www.youtube-nocookie.com");
  assert.equal(url.pathname, `/embed/${VIDEO_ID}`);
  assert.equal(url.searchParams.get("start"), "75");
  assert.equal(url.searchParams.get("autoplay"), "1");
  assert.equal(url.searchParams.get("controls"), "0");
  assert.equal(createPrivacyEnhancedEmbedUrl("../../attacker.example"), null);
  assert.equal(createYouTubeWatchUrl("invalid"), null);
});

test("normalizes and formats timestamps without allowing negative or unbounded values", () => {
  assert.equal(parseYouTubeTimestamp("1h2m3s"), 3723);
  assert.equal(parseYouTubeTimestamp("90"), 90);
  assert.equal(parseYouTubeTimestamp("1m30"), null);
  assert.equal(normalizeYouTubeTimestamp(-1), null);
  assert.equal(normalizeYouTubeTimestamp(Number.POSITIVE_INFINITY), null);
  assert.equal(normalizeYouTubeTimestamp(12.9), 12);
  assert.equal(formatVideoTimestamp(75), "1:15");
  assert.equal(formatVideoTimestamp(3723), "1:02:03");
});
