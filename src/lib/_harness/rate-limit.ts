/**
 * rate-limit.ts
 * シンプルな rate limit middleware（OWASP A04・API4・shieldfy throttling）。
 * Vercel KV (Upstash Redis) または in-memory fallback。
 *
 * 使い方：
 *
 *   import { rateLimit } from '@/_shared/lib/rate-limit';
 *
 *   export async function POST(req: Request) {
 *     const limit = await rateLimit({ key: ip(req), max: 30, windowSec: 60 });
 *     if (!limit.allowed) return tooManyRequests();
 *     ...
 *   }
 */

interface BucketEntry {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, BucketEntry>();
const MAX_MEMORY_KEYS = 10_000;

export interface RateLimitOptions {
  key: string;
  max: number;
  windowSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Vercel KV があればそちらを使う。なければ in-memory（serverless では複数インスタンス間で共有されない点に注意）。
 */
export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = opts.windowSec * 1000;

  // Vercel KV (Upstash) 優先
  const kvUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (kvUrl && kvToken) {
    return rateLimitKV(kvUrl, kvToken, opts, now, windowMs);
  }

  // In-memory fallback
  const entry = memoryBuckets.get(opts.key);
  if (!entry || entry.resetAt < now) {
    if (memoryBuckets.size >= MAX_MEMORY_KEYS) {
      // 最古を排除
      const oldestKey = memoryBuckets.keys().next().value;
      if (oldestKey !== undefined) memoryBuckets.delete(oldestKey);
    }
    const fresh: BucketEntry = { count: 1, resetAt: now + windowMs };
    memoryBuckets.set(opts.key, fresh);
    return { allowed: true, remaining: opts.max - 1, resetAt: fresh.resetAt };
  }

  if (entry.count >= opts.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return { allowed: true, remaining: opts.max - entry.count, resetAt: entry.resetAt };
}

async function rateLimitKV(
  url: string,
  token: string,
  opts: RateLimitOptions,
  now: number,
  windowMs: number
): Promise<RateLimitResult> {
  const key = `ratelimit:${opts.key}`;
  // Pipeline: INCR + EXPIRE
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, String(opts.windowSec), 'NX'],
      ['PTTL', key],
    ]),
  });
  if (!res.ok) {
    // KV 障害時は通す（fail-open）
    return { allowed: true, remaining: opts.max - 1, resetAt: now + windowMs };
  }
  const data: Array<{ result: number | string }> = await res.json();
  const count = Number(data[0]?.result ?? 0);
  const pttl = Number(data[2]?.result ?? -1);
  const resetAt = pttl > 0 ? now + pttl : now + windowMs;
  if (count > opts.max) {
    return { allowed: false, remaining: 0, resetAt };
  }
  return { allowed: true, remaining: Math.max(0, opts.max - count), resetAt };
}

/**
 * Request から IP 取得（Vercel/Cloudflare 対応）。
 */
export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    h.get('cf-connecting-ip') ||
    'unknown'
  );
}
