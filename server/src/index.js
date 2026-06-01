import cors from "cors";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import { config } from "./config.js";
import { subscriptionsRouter } from "./routes/subscriptions.js";
import { customerPaymentsRouter } from "./routes/customerPayments.js";
import { cloudinaryRouter } from "./routes/cloudinary.js";
import { adminUsersRouter } from "./routes/adminUsers.js";
import {
  createRateLimiter,
  securityHeaders
} from "./middleware/security.js";
import { sanitizeRequestPayload } from "./middleware/validation.js";

const app = express();
const allowedOrigins = new Set([config.clientUrl, config.adminUrl]);
const isLocalDevOrigin = (origin = "") =>
  /^http:\/\/(localhost|127\.0\.0\.1):517\d$/.test(origin);

app.disable("x-powered-by");
app.set("trust proxy", config.trustProxy);
app.use(securityHeaders);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || isLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
  })
);

app.use(
  "/api",
  createRateLimiter({
    keyPrefix: "api",
    max: config.security.apiRateLimitMax,
    windowMs: config.security.rateLimitWindowMs
  })
);

app.use(
  express.json({
    limit: "12mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    }
  })
);
app.use(hpp());
app.use(mongoSanitize({ replaceWith: "_" }));
app.use(sanitizeRequestPayload);

const healthPayload = {
  ok: true,
  service: "salon-queue-server",
  environment: process.env.NODE_ENV || "development"
};

app.get(["/health", "/api/health"], (_req, res) => {
  res.status(200).json({
    ...healthPayload,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.head(["/health", "/api/health"], (_req, res) => {
  res.sendStatus(200);
});

app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/customer-payments", customerPaymentsRouter);
app.use("/api/cloudinary", cloudinaryRouter);
app.use("/api/admin/users", adminUsersRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  const statusCode = err.statusCode || 500;
  const exposeDetails = process.env.NODE_ENV !== "production";

  res.status(statusCode).json({
    error:
      err.message ||
      err.error?.description ||
      err.details?.error?.description ||
      "Internal server error",
    details: exposeDetails ? err.details || undefined : undefined,
    statusCode: exposeDetails ? statusCode : undefined
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

export default app;
