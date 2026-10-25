import { PgBoss } from "pg-boss";
import { classifyTicketAsync } from "./ticket-classification.service";

export const CLASSIFY_TICKET_QUEUE = "classify-ticket";

let bossInstance: PgBoss | null = null;
let isStarted = false;

/**
 * Returns the active PgBoss instance if initialized.
 */
export function getBossInstance(): PgBoss | null {
  return bossInstance;
}

/**
 * Returns the current health and status of the background queue.
 */
export function getQueueStatus(): { isStarted: boolean; queueName: string } {
  return {
    isStarted,
    queueName: CLASSIFY_TICKET_QUEUE,
  };
}

/**
 * Starts the PgBoss background job runner and registers workers.
 * Safe to call multiple times (idempotent).
 */
export async function startQueue(
  connectionString?: string
): Promise<PgBoss | null> {
  if (bossInstance && isStarted) {
    return bossInstance;
  }

  const dbUrl = connectionString || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn(
      "[Queue] DATABASE_URL not configured. Background jobs will run via in-memory setImmediate fallback."
    );
    return null;
  }

  try {
    const boss = new PgBoss(dbUrl);

    boss.on("error", (error) => {
      console.error("[Queue] PgBoss background error:", error);
    });

    await boss.start();
    await boss.createQueue(CLASSIFY_TICKET_QUEUE, {
      retryLimit: 2,
    });

    // Register worker for ticket classification with 500ms polling interval
    await boss.work<{ ticketId: string }>(
      CLASSIFY_TICKET_QUEUE,
      { pollingIntervalSeconds: 0.5 },
      async (jobs) => {
        for (const job of jobs) {
          const { ticketId } = job.data;
          if (!ticketId) continue;
          try {
            await classifyTicketAsync(ticketId);
          } catch (error) {
            console.error(
              `[Queue] Worker error processing classification for ticket '${ticketId}':`,
              error
            );
            throw error; // Re-throw to allow pg-boss retry policy to handle it
          }
        }
      }
    );

    bossInstance = boss;
    isStarted = true;
    console.log(
      `[Queue] PgBoss initialized and listening on queue '${CLASSIFY_TICKET_QUEUE}'`
    );
    return bossInstance;
  } catch (error) {
    console.error(
      "[Queue] Failed to initialize PgBoss. Falling back to direct in-memory background dispatch:",
      error
    );
    bossInstance = null;
    isStarted = false;
    return null;
  }
}

/**
 * Stops the PgBoss background queue gracefully.
 */
export async function stopQueue(): Promise<void> {
  if (!bossInstance || !isStarted) {
    return;
  }

  try {
    console.log("[Queue] Stopping PgBoss background queue...");
    await bossInstance.stop({ graceful: true });
    console.log("[Queue] PgBoss stopped successfully.");
  } catch (error) {
    console.error("[Queue] Error stopping PgBoss:", error);
  } finally {
    bossInstance = null;
    isStarted = false;
  }
}

/**
 * Schedules a ticket for non-blocking classification using PG-boss.
 *
 * If the queue is active, sends a job to PG-boss.
 * If PG-boss is not started or fails, transparently falls back to
 * an asynchronous setImmediate execution to guarantee zero data loss.
 */
export async function enqueueTicketClassification(
  ticketId: string
): Promise<{ enqueued: boolean; jobId: string | null; method: "pg-boss" | "fallback" }> {
  if (bossInstance && isStarted) {
    try {
      const jobId = await bossInstance.send(
        CLASSIFY_TICKET_QUEUE,
        { ticketId },
        { retryLimit: 2, retryBackoff: true }
      );

      return {
        enqueued: true,
        jobId: jobId ?? null,
        method: "pg-boss",
      };
    } catch (error) {
      console.warn(
        `[Queue] Failed to enqueue ticket '${ticketId}' to pg-boss, falling back to direct async execution:`,
        error
      );
    }
  }

  // Resilient fallback: Non-blocking in-memory execution
  setImmediate(() => {
    classifyTicketAsync(ticketId).catch((err) => {
      console.error(
        `[Queue Fallback] Direct classification error for ticket '${ticketId}':`,
        err
      );
    });
  });

  return {
    enqueued: true,
    jobId: null,
    method: "fallback",
  };
}

