const { Client } = require("pg");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../server/.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function inspectQueue() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgres://postgres:postgrespassword@localhost:5432/ticket_helper";

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log("\n=======================================================");
    console.log("             PG-BOSS QUEUE INSPECTOR                  ");
    console.log("=======================================================\n");

    const stats = await client.query(`
      SELECT name, state, count(*)::int as total
      FROM pgboss.job
      GROUP BY name, state
      ORDER BY name, state;
    `);

    console.log("Job Summary by State:");
    if (stats.rows.length === 0) {
      console.log("  (No jobs found in pgboss.job)");
    } else {
      console.table(stats.rows);
    }

    const jobs = await client.query(`
      SELECT 
        id, 
        name, 
        state, 
        data->>'ticketId' as ticket_id,
        retry_count,
        created_on, 
        completed_on
      FROM pgboss.job
      ORDER BY created_on DESC
      LIMIT 10;
    `);

    console.log("\nRecent Jobs (Latest 10):");
    if (jobs.rows.length === 0) {
      console.log("  (No jobs found)");
    } else {
      console.table(jobs.rows);
    }
    console.log("");
  } catch (err) {
    console.error("Error inspecting queue:", err.message);
  } finally {
    await client.end();
  }
}

inspectQueue();

