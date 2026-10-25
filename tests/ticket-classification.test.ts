import { describe, it, expect } from "bun:test";
import {
  getDeterministicClassification,
  classifyTicketContent,
} from "../server/src/services/ticket-classification.service";

describe("Gemini Ticket Classification Service", () => {
  describe("getDeterministicClassification", () => {
    it("classifies critical production outages and security alerts as 'urgent'", () => {
      const outageResult = getDeterministicClassification(
        "URGENT: Production API returning 500 Internal Server Error",
        "Our checkout flow is completely down in production. Every request to /checkout times out."
      );

      expect(outageResult.priority).toBe("urgent");
      expect(outageResult.category).toBe("technical questions");
      expect(outageResult.confidence).toBeGreaterThan(0.9);
      expect(outageResult.tags).toContain("urgent");

      const securityResult = getDeterministicClassification(
        "Security Alert: Suspicious brute-force login attempts detected",
        "Our SOC detected 40,000 failed credential stuffing attempts from an IP block."
      );

      expect(securityResult.priority).toBe("urgent");
      expect(securityResult.category).toBe("technical questions");
    });

    it("classifies invoices, VAT exemptions, and billing disputes as 'high' priority", () => {
      const billingResult = getDeterministicClassification(
        "Requesting VAT Number and EU Tax Exemption applied to Invoice #INV-2026-041",
        "Please update our invoice with our reverse-charge VAT ID: DE318942158 and refund 19% VAT."
      );

      expect(billingResult.priority).toBe("high");
      expect(billingResult.category).toBe("billing");
      expect(billingResult.tags).toContain("billing");
    });

    it("classifies credential resets, portal access, and 403 errors as 'account access'", () => {
      const accessResult = getDeterministicClassification(
        "Cannot access assignment syllabus on student portal",
        "I am receiving a 403 Forbidden error whenever I try to login with my password."
      );

      expect(accessResult.priority).toBe("medium");
      expect(accessResult.category).toBe("account access");
      expect(accessResult.tags).toContain("access");
    });

    it("classifies general inquiries with standard medium priority", () => {
      const generalResult = getDeterministicClassification(
        "Question about upcoming webinar schedule",
        "Hi there, could you let me know what time the Monday workshop starts?"
      );

      expect(generalResult.priority).toBe("medium");
      expect(generalResult.category).toBe("general questions");
    });
  });

  describe("classifyTicketContent", () => {
    it("returns a structured classification result with all required fields", async () => {
      const result = await classifyTicketContent(
        "URGENT: Database connection pool timeout",
        "All queries are failing with 500 internal server error."
      );

      expect(result).toHaveProperty("priority");
      expect(["urgent", "high", "medium", "low"]).toContain(result.priority);
      expect(result).toHaveProperty("category");
      expect(typeof result.category).toBe("string");
      expect(result).toHaveProperty("confidence");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result).toHaveProperty("reasoning");
      expect(Array.isArray(result.tags)).toBe(true);
      expect(result).toHaveProperty("classifiedAt");
    });
  });
});

