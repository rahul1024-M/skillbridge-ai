const buckets = new Map();
let lastCleanup = Date.now();

export function rateLimit({ windowMs, max, key = (req) => req.ip }) {
  return (req, res, next) => {
    const now = Date.now();
    if (now - lastCleanup > windowMs) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
      lastCleanup = now;
    }

    const bucketKey = `${req.baseUrl}:${key(req)}`;
    const bucket = buckets.get(bucketKey);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= max) {
      res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }

    bucket.count += 1;
    return next();
  };
}
