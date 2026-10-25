import { describe, it, expect } from "bun:test";
import {
  getKnowledgeBaseContent,
  getDeterministicAutoResolution,
  evaluateAutoResolution,
} from "../server/src/services/ticket-auto-resolve.service";

describe("Knowledge Base Ticket Auto-Resolution Service", () => {
  describe("Knowledge Base File Loading", () => {
    it("loads the Code with Mosh knowledge base content successfully", () => {
      const content = getKnowledgeBaseContent();
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(100);
      expect(content).toContain("Code with Mosh");
      expect(content).toContain("Refund Policy");
      expect(content).toContain("Escalation Rules");
    });
  });

  describe("Section 1-9: Auto-Resolvable Knowledge Base Inquiries", () => {
    it("auto-resolves password reset questions with solution steps and Revanth Rao signature", () => {
      const result = getDeterministicAutoResolution(
        "I forgot my password. What should I do?",
        "I cannot log in to my account because I forgot the password.",
        "Sarah"
      );

      expect(result.shouldAutoResolve).toBe(true);
      expect(result.matchedSection).toBe("1. Account & Login Issues");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.resolutionReply).toContain("Hello Sarah,");
      expect(result.resolutionReply).toContain("Forgot Password");
      expect(result.resolutionReply).toContain("Revanth Rao");
      expect(result.resolutionReply).not.toContain("Code with Mosh Support Team");
    });

    it("auto-resolves missing course after purchase inquiries", () => {
      const result = getDeterministicAutoResolution(
        "I purchased a course but cannot see it",
        "My receipt confirmed payment but it's not appearing in my dashboard.",
        "John"
      );

      expect(result.shouldAutoResolve).toBe(true);
      expect(result.matchedSection).toBe("2. Course Access & Purchases");
      expect(result.resolutionReply).toContain("Hello John,");
      expect(result.resolutionReply).toContain("logged in with the exact email address");
      expect(result.resolutionReply).toContain("Revanth Rao");
    });

    it("auto-resolves course transfer policy inquiries", () => {
      const result = getDeterministicAutoResolution(
        "Can I transfer a purchased course to another account?",
        "I want to move my React course to my work email.",
        "Alex"
      );

      expect(result.shouldAutoResolve).toBe(true);
      expect(result.matchedSection).toBe("2. Course Access & Purchases");
      expect(result.resolutionReply).toContain("non-transferable");
      expect(result.resolutionReply).toContain("Revanth Rao");
    });

    it("auto-resolves lifetime access questions", () => {
      const result = getDeterministicAutoResolution(
        "What does Lifetime Access mean?",
        "Does lifetime access include future updates for the course?",
        "Devon"
      );

      expect(result.shouldAutoResolve).toBe(true);
      expect(result.matchedSection).toBe("3. Lifetime Access");
      expect(result.resolutionReply).toContain("permanently");
      expect(result.resolutionReply).toContain("future updates");
    });

    it("auto-resolves standard refund requests within 30 days", () => {
      const result = getDeterministicAutoResolution(
        "What is the refund policy?",
        "I purchased a course last week and want to request a refund.",
        "Elena"
      );

      expect(result.shouldAutoResolve).toBe(true);
      expect(result.matchedSection).toBe("4. Refund Policy");
      expect(result.resolutionReply).toContain("30-day money-back guarantee");
      expect(result.resolutionReply).toContain("80%");
      expect(result.resolutionReply).toContain("order receipt");
    });

    it("auto-resolves certificate eligibility and format questions", () => {
      const result = getDeterministicAutoResolution(
        "Do you provide certificates?",
        "Will I receive an accredited certificate upon course completion?",
        "Marcus"
      );

      expect(result.shouldAutoResolve).toBe(true);
      expect(result.matchedSection).toBe("5. Certificates");
      expect(result.resolutionReply).toContain("certificate of completion");
      expect(result.resolutionReply).toContain("not accredited university degrees");
    });

    it("auto-resolves offline video download inquiries", () => {
      const result = getDeterministicAutoResolution(
        "Can I download videos to watch offline?",
        "I am traveling and want to download course videos.",
        "Carlos"
      );

      expect(result.shouldAutoResolve).toBe(true);
      expect(result.matchedSection).toBe("6. Downloading Content");
      expect(result.resolutionReply).toContain("streamed online");
      expect(result.resolutionReply).toContain("source code, exercise files");
      expect(result.resolutionReply).toContain("Offline video downloads are not supported");
    });

    it("auto-resolves video playback technical issues", () => {
      const result = getDeterministicAutoResolution(
        "Videos are not playing on my computer",
        "When I click play on the lesson, the video is not playing and keeps buffering.",
        "Mia"
      );

      expect(result.shouldAutoResolve).toBe(true);
      expect(result.matchedSection).toBe("7. Technical Issues");
      expect(result.resolutionReply).toContain("Clear your browser cache");
      expect(result.resolutionReply).toContain("Chrome or Microsoft Edge");
    });

    it("auto-resolves coupon code issues", () => {
      const result = getDeterministicAutoResolution(
        "My coupon code doesn't work",
        "I tried entering the promo code SAVE20 but it says invalid.",
        "Lucas"
      );

      expect(result.shouldAutoResolve).toBe(true);
      expect(result.matchedSection).toBe("8. Coupon Codes");
      expect(result.resolutionReply).toContain("expired");
      expect(result.resolutionReply).toContain("only one coupon code");
    });

    it("auto-resolves account email change inquiries", () => {
      const result = getDeterministicAutoResolution(
        "How do I change my email address?",
        "I switched jobs and need to update my email address on my account.",
        "Chloe"
      );

      expect(result.shouldAutoResolve).toBe(true);
      expect(result.matchedSection).toBe("9. Account Changes");
      expect(result.resolutionReply).toContain("current registered email address");
      expect(result.resolutionReply).toContain("new email address");
      expect(result.resolutionReply).toContain("purchase receipt");
    });
  });

  describe("Section 10: Escalation Rules Enforcement", () => {
    it("escalates and refuses auto-resolve when customer threatens legal action", () => {
      const result = getDeterministicAutoResolution(
        "Demanding refund or I will take legal action",
        "If you do not refund me today, my lawyer will sue you in court.",
        "Angry Customer"
      );

      expect(result.shouldAutoResolve).toBe(false);
      expect(result.matchedSection).toBe("10. Escalation Rules");
      expect(result.escalationReason).toContain("Legal threat");
      expect(result.resolutionReply).toBeNull();
    });

    it("escalates and refuses auto-resolve for chargeback or payment disputes", () => {
      const result = getDeterministicAutoResolution(
        "Disputing the charge with my bank",
        "I am initiating a credit card chargeback for this purchase.",
        "Dispute Customer"
      );

      expect(result.shouldAutoResolve).toBe(false);
      expect(result.matchedSection).toBe("10. Escalation Rules");
      expect(result.escalationReason).toContain("Chargeback");
      expect(result.resolutionReply).toBeNull();
    });

    it("escalates and refuses auto-resolve for refunds requested outside 30 days", () => {
      const result = getDeterministicAutoResolution(
        "Requesting refund for course",
        "I purchased 45 days ago and want a refund past the 30-day window.",
        "Late Customer"
      );

      expect(result.shouldAutoResolve).toBe(false);
      expect(result.matchedSection).toBe("10. Escalation Rules");
      expect(result.escalationReason).toContain("outside 30-day");
      expect(result.resolutionReply).toBeNull();
    });

    it("escalates and refuses auto-resolve for account security / hacking concerns", () => {
      const result = getDeterministicAutoResolution(
        "Urgent: My account was hacked and stolen",
        "Someone had an unauthorized login and changed my profile.",
        "Breached Customer"
      );

      expect(result.shouldAutoResolve).toBe(false);
      expect(result.matchedSection).toBe("10. Escalation Rules");
      expect(result.escalationReason).toContain("security");
      expect(result.resolutionReply).toBeNull();
    });

    it("escalates custom questions not covered in the knowledge base", () => {
      const result = getDeterministicAutoResolution(
        "Question about enterprise team discounts for 100 developers",
        "We are looking to buy bulk licenses for 100 engineers with custom SAML setup.",
        "VP Engineering"
      );

      expect(result.shouldAutoResolve).toBe(false);
      expect(result.resolutionReply).toBeNull();
    });
  });

  describe("evaluateAutoResolution integration", () => {
    it("returns a structured evaluation result with shouldAutoResolve boolean", async () => {
      const evaluation = await evaluateAutoResolution(
        "Forgot my password",
        "Please send password reset email instructions.",
        "Alice"
      );

      expect(evaluation).toHaveProperty("shouldAutoResolve");
      expect(evaluation.shouldAutoResolve).toBe(true);
      expect(evaluation).toHaveProperty("matchedSection");
      expect(evaluation).toHaveProperty("confidence");
      expect(evaluation).toHaveProperty("resolutionReply");
      expect(typeof evaluation.resolutionReply).toBe("string");
    });
  });
});
