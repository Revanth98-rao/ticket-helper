import { describe, it, expect } from "bun:test";
import {
  polishReplySchema,
  replyTicketSchema,
  parseEmailSender,
  TICKET_STATUSES,
} from "../core/src/schemas/ticket";

describe("Ticket Core Schemas & Validation", () => {
  describe("polishReplySchema", () => {
    it("validates a minimal valid payload with draftText", () => {
      const result = polishReplySchema.safeParse({
        draftText: "Please check your network connection.",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.draftText).toBe("Please check your network connection.");
      }
    });

    it("validates a complete payload with optional context fields", () => {
      const result = polishReplySchema.safeParse({
        draftText: "reset your password and clearing cache should fix it",
        ticketSubject: "Login Portal Issue",
        customerMessage: "I cannot login to my account",
        customerName: "Maximilian Koch",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customerName).toBe("Maximilian Koch");
        expect(result.data.ticketSubject).toBe("Login Portal Issue");
        expect(result.data.customerMessage).toBe("I cannot login to my account");
      }
    });

    it("trims whitespace from draftText", () => {
      const result = polishReplySchema.safeParse({
        draftText: "   draft with surrounding spaces   ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.draftText).toBe("draft with surrounding spaces");
      }
    });

    it("fails validation when draftText is missing", () => {
      const result = polishReplySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("fails validation when draftText is an empty string", () => {
      const result = polishReplySchema.safeParse({ draftText: "" });
      expect(result.success).toBe(false);
    });

    it("fails validation when draftText is only whitespace", () => {
      const result = polishReplySchema.safeParse({ draftText: "     " });
      expect(result.success).toBe(false);
    });
  });

  describe("replyTicketSchema", () => {
    it("validates a valid reply message", () => {
      const result = replyTicketSchema.safeParse({
        bodyText: "We have resolved your issue.",
        status: "resolved",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bodyText).toBe("We have resolved your issue.");
        expect(result.data.status).toBe("resolved");
      }
    });

    it("allows omitting status", () => {
      const result = replyTicketSchema.safeParse({
        bodyText: "Looking into this now.",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBeUndefined();
      }
    });

    it("fails validation when bodyText is empty or whitespace", () => {
      const emptyResult = replyTicketSchema.safeParse({ bodyText: "" });
      expect(emptyResult.success).toBe(false);

      const whitespaceResult = replyTicketSchema.safeParse({ bodyText: "   \n\t  " });
      expect(whitespaceResult.success).toBe(false);
    });

    it("accepts all valid ticket statuses", () => {
      for (const status of TICKET_STATUSES) {
        const result = replyTicketSchema.safeParse({
          bodyText: "Status update test.",
          status,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid ticket statuses", () => {
      const result = replyTicketSchema.safeParse({
        bodyText: "Invalid status test.",
        status: "cancelled_invalid_status" as any,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("parseEmailSender", () => {
    it("parses RFC 2822 sender string with name and angle brackets", () => {
      const parsed = parseEmailSender("Jane Doe <jane@example.com>");
      expect(parsed.name).toBe("Jane Doe");
      expect(parsed.email).toBe("jane@example.com");
    });

    it("parses sender string with double quotes in name", () => {
      const parsed = parseEmailSender('"Dr. John Watson" <watson@bakerstreet.co.uk>');
      expect(parsed.name).toBe("Dr. John Watson");
      expect(parsed.email).toBe("watson@bakerstreet.co.uk");
    });

    it("parses bare email address and extracts prefix as name", () => {
      const parsed = parseEmailSender("student.sam@university.edu");
      expect(parsed.name).toBe("student.sam");
      expect(parsed.email).toBe("student.sam@university.edu");
    });

    it("handles object input with name and email", () => {
      const parsed = parseEmailSender({
        name: "Elena Rostova",
        email: "ELENA@datadog.com",
      });
      expect(parsed.name).toBe("Elena Rostova");
      expect(parsed.email).toBe("elena@datadog.com");
    });

    it("handles object input missing name by deriving from email prefix", () => {
      const parsed = parseEmailSender({
        email: "alex@company.org",
      });
      expect(parsed.name).toBe("alex");
      expect(parsed.email).toBe("alex@company.org");
    });
  });
});
