import { teardownTestDatabase } from "../scripts/teardown-test-db";

export default async function globalTeardown() {
  // If TEARDOWN_DB_AFTER_TESTS=true is set in env, clean up the test database
  if (process.env.TEARDOWN_DB_AFTER_TESTS === "true") {
    console.log("\n[Playwright Global Teardown] Cleaning up test database...");
    await teardownTestDatabase();
    console.log("[Playwright Global Teardown] Done.\n");
  }
}
