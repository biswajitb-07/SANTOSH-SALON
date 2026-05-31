import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { paymentsRouter } from "./routes/payments.js";
import { subscriptionsRouter } from "./routes/subscriptions.js";
import { customerPaymentsRouter } from "./routes/customerPayments.js";
import { cloudinaryRouter } from "./routes/cloudinary.js";
import {
  createRateLimiter,
  securityHeaders
} from "./middleware/security.js";

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

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "salon-queue-server" });
});

app.use("/api/payments", paymentsRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/customer-payments", customerPaymentsRouter);
app.use("/api/cloudinary", cloudinaryRouter);

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

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
