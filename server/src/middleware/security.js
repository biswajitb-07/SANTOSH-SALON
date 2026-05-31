import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { config } from "../config.js";
import { verifyFirebaseIdToken } from "../firebaseAdmin.js";

const getClientIp = (req) =>
  req.ip ||
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.socket?.remoteAddress ||
  "unknown";

export const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: "same-site" },
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "no-referrer" }
});

export const createRateLimiter = ({ max, windowMs, keyPrefix }) => {
  const limit = Number(max || config.security.apiRateLimitMax);
  const duration = Number(windowMs || config.security.rateLimitWindowMs);

  return rateLimit({
    windowMs: duration,
    max: limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${keyPrefix}:${getClientIp(req)}`,
    message: {
      error: "Too many requests. Please try again shortly."
    }
  });
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
