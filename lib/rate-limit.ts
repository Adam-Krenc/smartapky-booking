import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { AppEnv } from "./env";

let ratelimit: Ratelimit | null = null;

export function getBookRatelimit(env: AppEnv): Ratelimit {
  if (!ratelimit) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(env.BOOK_RATE_LIMIT_MAX, `${env.BOOK_RATE_LIMIT_WINDOW_SEC} s`),
      prefix: "smartapky-book",
      analytics: false,
    });
  }
  return ratelimit;
}

export function clientIp(headers: Headers): string {
  const xf = headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
