import * as Sentry from "@sentry/react";

const isBrowser = typeof window !== "undefined";
const dsn = isBrowser ? import.meta.env.VITE_SENTRY_DSN : undefined;

if (isBrowser && dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || "development",
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Tracing sample rate (100% in development, 20% in production)
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  });
  console.log("[Sentry] Frontend error logging initialized successfully.");
} else if (isBrowser) {
  console.log("[Sentry] VITE_SENTRY_DSN is not configured. Frontend error logging is inactive.");
}

export { Sentry };

