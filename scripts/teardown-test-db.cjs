const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

dotenv.config({ path: path.resolve(__dirname, "../.env.test") });

async function teardownTestDatabase() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/ticket_helper_test";

  const url = new URL(databaseUrl);
  const targetDbName = url.pathname.replace(/^\//, "");

  if (!targetDbName || targetDbName === "ticket_helper") {
    throw new Error(
      `[Test DB Teardown] Refusing to drop! Target database name cannot be production/development database ('${targetDbName}').`
    );
  }

  const defaultUrl = new URL(databaseUrl);
  defaultUrl.pathname = "/postgres";

  console.log(`[Test DB Teardown] Connecting to PostgreSQL to clean up '${targetDbName}'...`);
  const adminClient = new Client({ connectionString: defaultUrl.toString() });

  try {
    await adminClient.connect();

    await adminClient.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [targetDbName]
    );

    await adminClient.query(`DROP DATABASE IF EXISTS "${targetDbName}"`);
    console.log(`[Test DB Teardown] Database '${targetDbName}' dropped successfully.`);
  } finally {
    await adminClient.end();
  }
}

if (require.main === module) {
  teardownTestDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Test DB Teardown] Failed:", err);
      process.exit(1);
    });
}

module.exports = { teardownTestDatabase };
