const { setupTestDatabase } = require("../scripts/setup-test-db.cjs");

module.exports = async function globalSetup() {
  console.log("\n=======================================================");
  console.log("   Initializing Playwright Isolated Test Database...   ");
  console.log("=======================================================\n");

  await setupTestDatabase();

  console.log("\n=======================================================");
  console.log("   Test Database is Ready for Test Execution!         ");
  console.log("=======================================================\n");
};
