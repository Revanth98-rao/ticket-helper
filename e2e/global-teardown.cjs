const { teardownTestDatabase } = require("../scripts/teardown-test-db.cjs");

module.exports = async function globalTeardown() {
  if (process.env.TEARDOWN_DB_AFTER_TESTS === "true") {
    console.log("\n[Playwright Global Teardown] Cleaning up test database...");
    await teardownTestDatabase();
    console.log("[Playwright Global Teardown] Done.\n");
  }
};
