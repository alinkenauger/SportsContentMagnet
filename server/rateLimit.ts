import type { Request, RequestHandler } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
  key?: (req: Request) => string;
  now?: () => number;
  maxBuckets?: number;
  sweepIntervalRequests?: number;
};

type Bucket = { count: number; resetAt: number };

const MAX_BUCKETS = 50_000;
const SWEEP_INTERVAL_REQUESTS = 1_000;

function requestAddress(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function createRateLimit(options: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, Bucket>();
  const now = options.now ?? Date.now;
  const maxBuckets = Math.max(1, options.maxBuckets ?? MAX_BUCKETS);
  const sweepIntervalRequests = Math.max(
    1,
    options.sweepIntervalRequests ?? SWEEP_INTERVAL_REQUESTS,
  );
  let requestsSinceSweep = 0;

  return (req, res, next) => {
    const currentTime = now();
    requestsSinceSweep += 1;
    if (requestsSinceSweep >= sweepIntervalRequests) {
      buckets.forEach((bucket, key) => {
        if (bucket.resetAt <= currentTime) buckets.delete(key);
      });
      requestsSinceSweep = 0;
    }

    const identity = options.key?.(req) || requestAddress(req);
    const key = `${options.keyPrefix}:${identity}`;
    const existing = buckets.get(key);
    const bucket = !existing || existing.resetAt <= currentTime
      ? { count: 0, resetAt: currentTime + options.windowMs }
      : existing;

    if (!existing && buckets.size >= maxBuckets) {
      res.setHeader("Retry-After", Math.ceil(options.windowMs / 1_000));
      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    bucket.count += 1;
    buckets.set(key, bucket);
    res.setHeader("X-RateLimit-Limit", options.max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, options.max - bucket.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(bucket.resetAt / 1_000));

    if (bucket.count > options.max) {
      res.setHeader("Retry-After", Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1_000)));
      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    next();
  };
}
