import { PrismaClient } from "@prisma/client";

/**
 * Standard test configuration and seeded test credentials.
 */
export const TEST_CONFIG = {
  admin: {
    email: process.env.ADMIN_EMAIL || "admin@tickethelper.internal",
    password: process.env.ADMIN_PASSWORD || "adminpassword123",
    name: process.env.ADMIN_NAME || "Super Admin",
  },
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgrespassword@localhost:5432/ticket_helper_test",
  apiUrl: process.env.BETTER_AUTH_URL || "http://localhost:5001",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5174",
};

/**
 * Helper to obtain a dedicated Prisma client pointing to the test database.
 */
export function getTestPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: TEST_CONFIG.databaseUrl,
      },
    },
    log: ["error"],
  });
}
