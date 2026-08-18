import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildYouTubeVideoDataFromOEmbed,
  detectYouTubeTranscriptTimeUnit,
  extractVideoId,
  getYouTubeVideoData,
  normalizeYouTubeTranscriptRows,
} from './services/youtube';

const VIDEO_ID = 'WvUSs6yTltE';

test('YouTube IDs use the shared strict provider parser', () => {
  assert.equal(extractVideoId(`https://www.youtube.com/watch?v=${VIDEO_ID}&t=42s`), VIDEO_ID);
  assert.equal(extractVideoId(`https://youtu.be/${VIDEO_ID}?si=tracking`), VIDEO_ID);
  assert.equal(extractVideoId(`https://www.youtube.com/shorts/${VIDEO_ID}`), VIDEO_ID);
  assert.equal(extractVideoId(VIDEO_ID), VIDEO_ID);

  assert.equal(extractVideoId(`https://youtube.com.evil.example/watch?v=${VIDEO_ID}`), null);
  assert.equal(extractVideoId(`https://www.youtube.com:8443/watch?v=${VIDEO_ID}`), null);
  assert.equal(extractVideoId(`https://www.youtube.com/watch/not-a-video?v=${VIDEO_ID}`), null);
  assert.equal(extractVideoId('javascript:alert(1)'), null);
});

test('oEmbed fallback accepts text only and constructs canonical URLs from the video ID', () => {
  const metadata = buildYouTubeVideoDataFromOEmbed(VIDEO_ID, {
    title: '  <b>Better</b>   Basketball  ',
    author_name: ' Coach\nExample ',
    html: '<iframe src="https://evil.example/embed"></iframe>',
    thumbnail_url: 'https://evil.example/thumbnail.jpg',
    author_url: 'https://evil.example/coach',
  });

  assert.deepEqual(metadata, {
    videoId: VIDEO_ID,
    title: 'Better Basketball',
    description: '',
    thumbnailUrl: `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`,
    duration: 'PT0S',
    channelTitle: 'Coach Example',
    publishedAt: '',
    viewCount: 0,
    likeCount: 0,
  });
  assert.doesNotMatch(JSON.stringify(metadata), /evil\.example|iframe/i);
  assert.throws(
    () => buildYouTubeVideoDataFromOEmbed('not-a-video-id', {}),
    /Invalid YouTube video ID/,
  );
});

test('srv3 millisecond rows become safe second-based public segments', () => {
  const normalized = normalizeYouTubeTranscriptRows([
    {
      offset: 1_250,
      duration: 2_750,
      text: '  First &amp; &lt;b&gt;move&lt;/b&gt;  ',
    },
    { offset: 4_000, duration: 0, text: '\u200b Hold position ' },
    { offset: -5, duration: 500, text: 'negative start' },
    { offset: 5_000, duration: Number.POSITIVE_INFINITY, text: 'infinite' },
    { offset: 6_000, duration: 500, text: '   ' },
  ], 'milliseconds');

  assert.deepEqual(normalized, {
    text: 'First & move Hold position',
    segments: [
      { start: 1.25, end: 4, text: 'First & move' },
      { start: 4, end: 4, text: 'Hold position' },
    ],
  });
  assert.ok(normalized.segments.every((segment) => (
    Number.isFinite(segment.start)
    && Number.isFinite(segment.end)
    && segment.start >= 0
    && segment.end >= segment.start
  )));
});

test('classic second rows preserve fractional timing', () => {
  const normalized = normalizeYouTubeTranscriptRows([
    { offset: 1.25, duration: 2.75, text: ' Set up ' },
    { offset: 4, duration: 1.5, text: '<i>Finish</i> tall' },
  ], 'seconds');

  assert.deepEqual(normalized, {
    text: 'Set up Finish tall',
    segments: [
      { start: 1.25, end: 4, text: 'Set up' },
      { start: 4, end: 5.5, text: 'Finish tall' },
    ],
  });
});

test('transcript XML detection distinguishes srv3 milliseconds from classic seconds', () => {
  assert.equal(
    detectYouTubeTranscriptTimeUnit('<transcript><p t="1250" d="2750"><s>Move</s></p></transcript>'),
    'milliseconds',
  );
  assert.equal(
    detectYouTubeTranscriptTimeUnit('<transcript><text start="1.25" dur="2.75">Move</text></transcript>'),
    'seconds',
  );
  assert.equal(detectYouTubeTranscriptTimeUnit('<transcript />'), null);
});

async function withMockedYouTubeEnvironment(
  apiKey: string | null,
  mockFetch: typeof globalThis.fetch,
  callback: () => Promise<void>,
) {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.YOUTUBE_API_KEY;
  const originalLegacyApiKey = process.env.YOUTUBE_API_KEY_ENV_VAR;
  const originalWarn = console.warn;
  try {
    globalThis.fetch = mockFetch;
    console.warn = () => undefined;
    if (apiKey === null) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = apiKey;
    delete process.env.YOUTUBE_API_KEY_ENV_VAR;
    await callback();
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    if (originalApiKey === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = originalApiKey;
    if (originalLegacyApiKey === undefined) delete process.env.YOUTUBE_API_KEY_ENV_VAR;
    else process.env.YOUTUBE_API_KEY_ENV_VAR = originalLegacyApiKey;
  }
}

test('metadata lookup goes directly to the fixed oEmbed endpoint without an API key', async () => {
  const requestedUrls: URL[] = [];
  await withMockedYouTubeEnvironment(
    null,
    async (input) => {
      requestedUrls.push(new URL(input instanceof Request ? input.url : input.toString()));
      return Response.json({
        title: 'Real video title',
        author_name: 'Real channel',
        html: '<iframe src="https://evil.example"></iframe>',
        thumbnail_url: 'https://evil.example/image.jpg',
      });
    },
    async () => {
      const result = await getYouTubeVideoData(`https://www.youtube.com/watch?v=${VIDEO_ID}`);
      assert.equal(result.title, 'Real video title');
      assert.equal(result.channelTitle, 'Real channel');
      assert.equal(result.thumbnailUrl, `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`);
    },
  );

  assert.equal(requestedUrls.length, 1);
  assert.equal(requestedUrls[0].origin, 'https://www.youtube.com');
  assert.equal(requestedUrls[0].pathname, '/oembed');
  assert.equal(requestedUrls[0].searchParams.get('format'), 'json');
  assert.equal(
    requestedUrls[0].searchParams.get('url'),
    `https://www.youtube.com/watch?v=${VIDEO_ID}`,
  );
});

test('metadata lookup falls back to oEmbed when the official API fails', async () => {
  const requestedUrls: URL[] = [];
  await withMockedYouTubeEnvironment(
    'test-api-key',
    async (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      requestedUrls.push(url);
      if (url.hostname === 'www.googleapis.com') {
        return Response.json({ error: { message: 'quota' } }, { status: 403 });
      }
      return Response.json({ title: 'Fallback title', author_name: 'Fallback channel' });
    },
    async () => {
      const result = await getYouTubeVideoData(VIDEO_ID);
      assert.equal(result.title, 'Fallback title');
      assert.equal(result.channelTitle, 'Fallback channel');
    },
  );

  assert.deepEqual(
    requestedUrls.map((url) => url.hostname),
    ['www.googleapis.com', 'www.youtube.com'],
  );
});

test('metadata lookup keeps the official Data API response when available', async () => {
  const requestedUrls: URL[] = [];
  await withMockedYouTubeEnvironment(
    'test-api-key',
    async (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      requestedUrls.push(url);
      return Response.json({
        items: [{
          snippet: {
            title: 'Official title',
            description: 'Official description',
            thumbnails: { maxres: { url: 'https://i.ytimg.com/official.jpg' } },
            channelTitle: 'Official channel',
            publishedAt: '2026-01-02T03:04:05Z',
          },
          statistics: { viewCount: '1234', likeCount: '56' },
          contentDetails: { duration: 'PT4M13S' },
        }],
      });
    },
    async () => {
      assert.deepEqual(await getYouTubeVideoData(VIDEO_ID), {
        videoId: VIDEO_ID,
        title: 'Official title',
        description: 'Official description',
        thumbnailUrl: 'https://i.ytimg.com/official.jpg',
        duration: 'PT4M13S',
        channelTitle: 'Official channel',
        publishedAt: '2026-01-02T03:04:05Z',
        viewCount: 1234,
        likeCount: 56,
      });
    },
  );

  assert.equal(requestedUrls.length, 1);
  assert.equal(requestedUrls[0].hostname, 'www.googleapis.com');
  assert.equal(requestedUrls[0].searchParams.get('id'), VIDEO_ID);
  assert.equal(requestedUrls[0].searchParams.get('key'), 'test-api-key');
});
