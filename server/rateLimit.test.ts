import assert from "node:assert/strict";
import test from "node:test";
import { createRateLimit } from "./rateLimit";

function invoke(limiter: ReturnType<typeof createRateLimit>, ip: string) {
  let nextCalls = 0;
  const headers = new Map<string, string>();
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string | number) {
      headers.set(name, String(value));
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  limiter({ ip, socket: {} } as any, response as any, () => {
    nextCalls += 1;
  });
  return { nextCalls, response, headers };
}

test("limits requests by client key and emits a retry window", () => {
  let now = 1_000;
  const limiter = createRateLimit({
    windowMs: 10_000,
    max: 2,
    keyPrefix: "test",
    now: () => now,
  });

  assert.equal(invoke(limiter, "198.51.100.1").nextCalls, 1);
  assert.equal(invoke(limiter, "198.51.100.1").nextCalls, 1);
  const blocked = invoke(limiter, "198.51.100.1");
  assert.equal(blocked.nextCalls, 0);
  assert.equal(blocked.response.statusCode, 429);
  assert.equal(blocked.headers.get("Retry-After"), "10");
  assert.equal(invoke(limiter, "198.51.100.2").nextCalls, 1);

  now += 10_001;
  assert.equal(invoke(limiter, "198.51.100.1").nextCalls, 1);
});

test("capacity does not trigger a full sweep on every unseen request", () => {
  let now = 1_000;
  const limiter = createRateLimit({
    windowMs: 10_000,
    max: 5,
    keyPrefix: "bounded-sweep",
    now: () => now,
    maxBuckets: 2,
    sweepIntervalRequests: 5,
  });

  assert.equal(invoke(limiter, "198.51.100.1").nextCalls, 1);
  assert.equal(invoke(limiter, "198.51.100.2").nextCalls, 1);
  now += 10_001;

  const blockedBeforeCadence = invoke(limiter, "198.51.100.3");
  assert.equal(blockedBeforeCadence.nextCalls, 0);
  assert.equal(blockedBeforeCadence.response.statusCode, 429);

  const stillBlockedBeforeCadence = invoke(limiter, "198.51.100.4");
  assert.equal(stillBlockedBeforeCadence.nextCalls, 0);
  assert.equal(stillBlockedBeforeCadence.response.statusCode, 429);

  // The fifth request is the configured cleanup cadence. Only then are the
  // expired buckets scanned and capacity becomes available to an unseen key.
  assert.equal(invoke(limiter, "198.51.100.3").nextCalls, 1);
});

test("an existing key resets locally at capacity while unseen keys fail closed", () => {
  let now = 1_000;
  const limiter = createRateLimit({
    windowMs: 10_000,
    max: 1,
    keyPrefix: "capacity-reset",
    now: () => now,
    maxBuckets: 2,
    sweepIntervalRequests: 100,
  });

  assert.equal(invoke(limiter, "198.51.100.1").nextCalls, 1);
  assert.equal(invoke(limiter, "198.51.100.2").nextCalls, 1);
  now += 10_001;

  assert.equal(invoke(limiter, "198.51.100.1").nextCalls, 1);
  const unseen = invoke(limiter, "198.51.100.3");
  assert.equal(unseen.nextCalls, 0);
  assert.equal(unseen.response.statusCode, 429);
});
