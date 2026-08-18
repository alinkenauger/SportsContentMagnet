import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { YouTubeSourcePlayer } from "./youtube-source-player";

const VIDEO_ID = "dQw4w9WgXcQ";

test("renders a titled privacy-enhanced player with accessible review controls", () => {
  const html = renderToStaticMarkup(createElement(YouTubeSourcePlayer, {
    source: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    title: "Weekly Reset source video",
    heading: "Watch the original lesson",
    moments: [{
      id: "proof",
      label: "Define visible proof",
      seconds: 75,
      kind: "review",
    }],
  }));

  assert.match(html, /https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  assert.match(html, /title="Weekly Reset source video"/);
  assert.match(html, /aria-label="Review key moments"/);
  assert.match(html, /aria-label="Jump to review moment Define visible proof at 1:15"/);
  assert.match(html, /Privacy-enhanced YouTube player/);
});

test("never renders an iframe for an untrusted source URL", () => {
  const html = renderToStaticMarkup(createElement(YouTubeSourcePlayer, {
    source: `https://youtube.com.attacker.example/watch?v=${VIDEO_ID}`,
    title: "Untrusted source",
    invalidSourceFallback: "Source unavailable",
  }));

  assert.doesNotMatch(html, /<iframe/);
  assert.doesNotMatch(html, /attacker\.example/);
  assert.match(html, /data-youtube-source-invalid="true"/);
  assert.match(html, /Source unavailable/);
});
