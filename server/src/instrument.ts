import "dotenv/config";
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  });
  console.log("[Sentry] Server error logging initialized successfully.");
} else {
  console.log("[Sentry] SENTRY_DSN is not configured. Server error logging is inactive.");
}

export { Sentry };
