import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Client } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envTestPath = path.resolve(__dirname, "../.env.test");
dotenv.config({ path: envTestPath });

export async function teardownTestDatabase() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgres://postgres:postgrespassword@localhost:5432/ticket_helper_test";

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

    // Terminate existing connections to test database
    await adminClient.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [targetDbName]
    );

    // Drop test database
    await adminClient.query(`DROP DATABASE IF EXISTS "${targetDbName}"`);
    console.log(`[Test DB Teardown] Database '${targetDbName}' dropped successfully.`);
  } finally {
    await adminClient.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  teardownTestDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Test DB Teardown] Failed:", err);
      process.exit(1);
    });
}
