import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  CLASSIFY_TICKET_QUEUE,
  getQueueStatus,
  enqueueTicketClassification,
  startQueue,
  stopQueue,
} from "../server/src/services/queue.service";

describe("PG-Boss Background Queue Service", () => {
  afterEach(async () => {
    await stopQueue();
  });

  describe("Queue Configuration & Status", () => {
    it("exports the standard classification queue name", () => {
      expect(CLASSIFY_TICKET_QUEUE).toBe("classify-ticket");
    });

    it("reports inactive state when queue is not started", () => {
      const status = getQueueStatus();
      expect(status.isStarted).toBe(false);
      expect(status.queueName).toBe("classify-ticket");
    });
  });

  describe("enqueueTicketClassification", () => {
    it("falls back gracefully to direct non-blocking dispatch when pg-boss is stopped", async () => {
      const result = await enqueueTicketClassification("test-ticket-id-fallback");

      expect(result.enqueued).toBe(true);
      expect(result.jobId).toBeNull();
      expect(result.method).toBe("fallback");
    });

    it("handles multiple concurrent enqueue requests without throwing", async () => {
      const ticketIds = ["ticket-1", "ticket-2", "ticket-3", "ticket-4"];
      const results = await Promise.all(
        ticketIds.map((id) => enqueueTicketClassification(id))
      );

      expect(results).toHaveLength(4);
      for (const res of results) {
        expect(res.enqueued).toBe(true);
      }
    });

    it("handles missing or empty ticketId safely", async () => {
      const result = await enqueueTicketClassification("");
      expect(result.enqueued).toBe(true);
    });
  });

  describe("Queue Lifecycle & Resiliency", () => {
    it("stopQueue is safe and idempotent when called repeatedly", async () => {
      await stopQueue();
      await stopQueue();
      const status = getQueueStatus();
      expect(status.isStarted).toBe(false);
    });

    it("returns null safely when startQueue is called with no database connection", async () => {
      const origError = console.error;
      console.error = () => {};
      try {
        // Intentionally invalid connection string that immediately rejects
        const boss = await startQueue("postgres://invalid_user:invalid_pass@127.0.0.1:9999/nonexistent");
        expect(boss).toBeNull();
        expect(getQueueStatus().isStarted).toBe(false);
      } finally {
        console.error = origError;
      }
    });
  });
});
