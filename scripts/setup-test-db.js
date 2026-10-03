import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Client } from "pg";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment variables
const envTestPath = path.resolve(__dirname, "../.env.test");
dotenv.config({ path: envTestPath });

export async function setupTestDatabase() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgres://postgres:postgrespassword@localhost:5432/ticket_helper_test";

  const url = new URL(databaseUrl);
  const targetDbName = url.pathname.replace(/^\//, "");

  if (!targetDbName || targetDbName === "ticket_helper") {
    throw new Error(
      `[Test DB Setup] Safety check failed! Target database name cannot be empty or the production/development database ('ticket_helper'). Received: '${targetDbName}'`
    );
  }

  // Connect to default 'postgres' database to manage test databases
  const defaultUrl = new URL(databaseUrl);
  defaultUrl.pathname = "/postgres";

  console.log(`[Test DB Setup] Connecting to PostgreSQL server...`);
  const adminClient = new Client({ connectionString: defaultUrl.toString() });

  try {
    await adminClient.connect();

    // Check if target test database exists
    const checkDbRes = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDbName]
    );

    if (checkDbRes.rows.length === 0) {
      console.log(`[Test DB Setup] Creating test database '${targetDbName}'...`);
      await adminClient.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`[Test DB Setup] Database '${targetDbName}' created.`);
    } else {
      console.log(`[Test DB Setup] Database '${targetDbName}' already exists.`);
    }
  } finally {
    await adminClient.end();
  }

  // Ensure pgvector extension in the test database
  console.log(`[Test DB Setup] Initializing extensions in '${targetDbName}'...`);
  const testDbClient = new Client({ connectionString: databaseUrl });
  try {
    await testDbClient.connect();
    await testDbClient.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log(`[Test DB Setup] 'vector' extension is active.`);
  } finally {
    await testDbClient.end();
  }

  // Run Prisma migrations against the test database
  console.log(`[Test DB Setup] Applying Prisma migrations to '${targetDbName}'...`);
  const schemaPath = path.resolve(__dirname, "../server/prisma/schema.prisma");
  execSync(`bun prisma migrate deploy --schema="${schemaPath}"`, {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });

  // Seed test database with admin user
  console.log(`[Test DB Setup] Seeding test database '${targetDbName}'...`);
  const seedScriptPath = path.resolve(__dirname, "../server/src/db/seed.ts");
  execSync(`bun run "${seedScriptPath}"`, {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });

  console.log(`[Test DB Setup] Test database '${targetDbName}' setup complete and ready!`);
}

// Run directly if invoked from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setupTestDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Test DB Setup] Failed:", err);
      process.exit(1);
    });
}
