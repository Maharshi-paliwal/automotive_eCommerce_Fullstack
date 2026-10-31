import { createHash } from "node:crypto";
import type { Request, RequestHandler } from "express";

type WindowState = { count: number; resetAt: number };
type RateLimitOptions = {
  windowMs: number;
  max: number;
  accountKey?: (req: Request) => string | null;
  message?: string;
};

export const createRateLimiter = ({ windowMs, max, accountKey, message = "Too many requests; please try again later" }: RateLimitOptions): RequestHandler => {
  const windows = new Map<string, WindowState>();
  let operations = 0;

  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const rawAccount = accountKey?.(req)?.trim().toLowerCase();
    const accountHash = rawAccount
      ? createHash("sha256").update(rawAccount).digest("hex")
      : null;
    const keys = [`${ip}:ip`, ...(accountHash ? [`${accountHash}:account`] : [])];

    operations += 1;
    if (operations % 256 === 0 || windows.size > 10_000) {
      for (const [key, state] of windows) {
        if (state.resetAt <= now) windows.delete(key);
      }
    }

    const states = keys.map((key) => {
      let state = windows.get(key);
      if (!state || state.resetAt <= now) {
        state = { count: 0, resetAt: now + windowMs };
        windows.set(key, state);
      }
      state.count += 1;
      return state;
    });
    const retryAfter = Math.max(...states.map((state) => Math.ceil((state.resetAt - now) / 1000)));
    const remaining = Math.max(0, ...states.map((state) => max - state.count));
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil((now + retryAfter * 1000) / 1000)));

    if (states.some((state) => state.count > max)) {
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ message });
    }
    return next();
  };
};

export const authRegisterRateLimit = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 10,
  accountKey: (req) => typeof req.body?.email === "string" ? `register:${req.body.email}` : null,
});

export const authLoginRateLimit = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 10,
  accountKey: (req) => typeof req.body?.email === "string" ? `login:${req.body.email}` : null,
});

export const deliveryLoginRateLimit = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 10,
  accountKey: (req) => typeof req.body?.email === "string" ? `delivery-login:${req.body.email}` : null,
});

export const deliveryOtpRateLimit = createRateLimiter({
  windowMs: 10 * 60_000,
  max: 5,
  accountKey: (req) => req.partner?.id && typeof req.params.id === "string"
    ? `delivery-otp:${req.partner.id}:${req.params.id}`
    : null,
  message: "Too many OTP attempts; please try again later",
});

export const deliveryLocationRateLimit = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  accountKey: (req) => req.partner?.id && typeof req.params.id === "string"
    ? `delivery-location:${req.partner.id}:${req.params.id}`
    : null,
  message: "Location update limit reached; please try again shortly",
});
