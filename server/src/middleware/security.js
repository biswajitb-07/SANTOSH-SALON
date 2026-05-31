import { config } from "../config.js";
import { verifyFirebaseIdToken } from "../firebaseAdmin.js";

const rateBuckets = new Map();

const getClientIp = (req) =>
  req.ip ||
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.socket?.remoteAddress ||
  "unknown";

export const securityHeaders = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
};

export const createRateLimiter = ({ max, windowMs, keyPrefix }) => {
  const limit = Number(max || config.security.apiRateLimitMax);
  const duration = Number(windowMs || config.security.rateLimitWindowMs);

  return (req, res, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${getClientIp(req)}`;
    const bucket = rateBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      if (rateBuckets.size > 5000) {
        for (const [bucketKey, bucketValue] of rateBuckets.entries()) {
          if (bucketValue.resetAt <= now) rateBuckets.delete(bucketKey);
        }
      }
      rateBuckets.set(key, { count: 1, resetAt: now + duration });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: "Too many requests. Please try again shortly."
      });
    }

    return next();
  };
};

export const requireFirebaseUser = async (req, res, next) => {
  const header = req.header("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({ error: "Firebase ID token is required." });
  }

  try {
    req.user = await verifyFirebaseIdToken(token);
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireAdminUser = [
  requireFirebaseUser,
  (req, res, next) => {
    const allowedEmails = config.security.adminAllowedEmails;
    const email = String(req.user?.email || "").toLowerCase();

    if (allowedEmails.length && !allowedEmails.includes(email)) {
      return res.status(403).json({ error: "Admin access denied." });
    }

    return next();
  }
];
