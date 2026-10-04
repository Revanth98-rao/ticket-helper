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

  if (!envOrigins) {
    return ["http://localhost:5173"];
  }

  const list = envOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set(list));
}

const secret = process.env.BETTER_AUTH_SECRET;

if (process.env.NODE_ENV === "production") {
  if (!secret) {
    throw new Error(
      "FATAL: BETTER_AUTH_SECRET environment variable is missing in production!"
    );
  }
  if (
    secret.length < 32 ||
    secret.includes("change-in-production") ||
    secret.includes("super-secret")
  ) {
    throw new Error(
      "FATAL: Insecure or placeholder BETTER_AUTH_SECRET detected in production. Generate a strong 32+ character random secret."
    );
  }
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
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
              max: 5,
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
