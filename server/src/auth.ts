import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

/**
 * Returns trusted origins parsed from environment variables (BETTER_AUTH_TRUSTED_ORIGINS or CLIENT_URL).
 * Eliminates duplicates and handles comma-separated domains.
 */
export function getTrustedOrigins(): string[] {
  const envOrigins =
    process.env.BETTER_AUTH_TRUSTED_ORIGINS || process.env.CLIENT_URL;

  const origins: string[] = [
    "http://localhost:5173",
    "http://localhost:5000",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5000",
    "*.railway.app",
    "*.up.railway.app",
    "https://*.railway.app",
    "https://*.up.railway.app",
    "http://*.railway.app",
    "http://*.up.railway.app",
  ];

  if (envOrigins) {
    origins.push(
      ...envOrigins
        .split(",")
        .map((origin) => {
          const cleaned = origin.trim().replace(/\/+$/, "");
          if (!cleaned) return [];
          if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://") && !cleaned.startsWith("*")) {
            return [`https://${cleaned}`, `http://${cleaned}`];
          }
          return [cleaned];
        })
        .flat()
        .filter(Boolean)
    );
  }

  // Support Railway domain environment variables automatically
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    const domain = process.env.RAILWAY_PUBLIC_DOMAIN.trim().replace(/\/+$/, "");
    origins.push(`https://${domain}`, `http://${domain}`);
  }
  if (process.env.RAILWAY_STATIC_URL) {
    const url = process.env.RAILWAY_STATIC_URL.trim().replace(/\/+$/, "");
    origins.push(`https://${url}`, `http://${url}`);
  }

  return Array.from(new Set(origins));
}

const secret =
  process.env.BETTER_AUTH_SECRET ||
  "ticket-helper-production-fallback-auth-secret-key-32-chars";

if (
  process.env.NODE_ENV === "production" &&
  (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32)
) {
  console.warn(
    "[Better Auth] WARNING: BETTER_AUTH_SECRET should be a strong 32+ character key in production."
  );
}

/**
 * Normalizes a base URL to ensure it has a valid protocol (http:// or https://).
 * Handles bare domains like "ticket-helper-production.up.railway.app".
 */
export function formatBaseUrl(rawUrl?: string): string {
  if (!rawUrl || rawUrl.trim() === "") {
    return process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN.trim().replace(/\/+$/, "")}`
      : "http://localhost:5000";
  }
  let cleaned = rawUrl.trim().replace(/\/+$/, "");
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

const resolvedBaseURL = formatBaseUrl(
  process.env.BETTER_AUTH_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN.trim().replace(/\/+$/, "")}`
      : undefined)
);

export const auth = betterAuth({
  baseURL: resolvedBaseURL,
  secret:
    secret ||
    (process.env.NODE_ENV !== "production"
      ? "dev-fallback-secret-min-32-characters-key"
      : undefined),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "agent",
        required: false,
      },
      deletedAt: {
        type: "date",
        required: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email":
        process.env.NODE_ENV === "production"
          ? {
              window: 60,
              max: 30,
            }
          : false,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // 1 day
  },
  trustedOrigins: getTrustedOrigins(),
});
