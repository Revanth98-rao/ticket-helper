import { describe, it, expect } from "bun:test";
import {
  formatCustomerGreetingName,
  formatAgentSignature,
  formatDeterministicFallback,
  postProcessPolishedReply,
} from "../server/src/services/polish-formatter.service";

describe("Polish Formatter Service", () => {
  describe("formatCustomerGreetingName", () => {
    it("returns provided customer display name", () => {
      expect(formatCustomerGreetingName("Maximilian Koch", "m.koch@example.com")).toBe("Maximilian Koch");
      expect(formatCustomerGreetingName("Student Sam", "student@example.com")).toBe("Student Sam");
    });

    it("trims excess whitespace around customer name", () => {
      expect(formatCustomerGreetingName("   Elena Rostova   ", "elena@datadog.com")).toBe("Elena Rostova");
    });

    it("falls back to capitalized email prefix when customer name is absent", () => {
      expect(formatCustomerGreetingName(null, "m.koch@bavaria-robotics.de")).toBe("M.koch");
      expect(formatCustomerGreetingName("", "support-user@company.org")).toBe("Support-user");
    });

    it("capitalizes single-word lowercase customer name or email prefix", () => {
      expect(formatCustomerGreetingName(null, "alex@example.com")).toBe("Alex");
      expect(formatCustomerGreetingName("sarah", null)).toBe("Sarah");
    });

    it("strips domain and capitalizes if email address was accidentally passed as customer name", () => {
      expect(formatCustomerGreetingName("user@domain.com", null)).toBe("User");
    });

    it("falls back to 'there' when both name and email are absent", () => {
      expect(formatCustomerGreetingName(null, null)).toBe("there");
      expect(formatCustomerGreetingName("", "")).toBe("there");
      expect(formatCustomerGreetingName("   ", "   ")).toBe("there");
    });
  });

  describe("formatAgentSignature", () => {
    it("appends 'Revanth Rao' when agent name does not include it", () => {
      expect(formatAgentSignature("Alice Smith")).toBe("Alice Smith\nRevanth Rao");
      expect(formatAgentSignature("Super Admin")).toBe("Super Admin\nRevanth Rao");
    });

    it("defaults to 'Support Agent\\nRevanth Rao' when agent name is missing", () => {
      expect(formatAgentSignature(null)).toBe("Support Agent\nRevanth Rao");
      expect(formatAgentSignature(undefined)).toBe("Support Agent\nRevanth Rao");
      expect(formatAgentSignature("   ")).toBe("Support Agent\nRevanth Rao");
    });

    it("does not duplicate 'Revanth Rao' when already present in agent name", () => {
      expect(formatAgentSignature("Revanth Rao")).toBe("Revanth Rao");
      expect(formatAgentSignature("revanth rao")).toBe("revanth rao");
      expect(formatAgentSignature("Revanth Rao (Lead Support)")).toBe("Revanth Rao (Lead Support)");
    });
  });

  describe("formatDeterministicFallback", () => {
    it("creates a properly capitalized, addressed, and signed fallback reply", () => {
      const output = formatDeterministicFallback(
        "we reset your credentials",
        "Student Sam",
        "Super Admin\nRevanth Rao"
      );

      expect(output).toContain("Hello Student Sam,");
      expect(output).toContain("Thank you for reaching out to us. We reset your credentials.");
      expect(output).toContain("Please let us know if you need any further assistance.");
      expect(output).toContain("Best regards,\nSuper Admin\nRevanth Rao");
    });

    it("uses generic 'Hello,' when customer name is 'there'", () => {
      const output = formatDeterministicFallback(
        "your order has shipped.",
        "there",
        "Support Agent\nRevanth Rao"
      );

      expect(output.startsWith("Hello,\n\n")).toBe(true);
      expect(output).toContain("Thank you for reaching out to us. Your order has shipped.");
      expect(output).toContain("Best regards,\nSupport Agent\nRevanth Rao");
    });

    it("preserves existing terminal punctuation without double periods", () => {
      const outputWithExclamation = formatDeterministicFallback(
        "your ticket is resolved!",
        "Alex",
        "Super Admin\nRevanth Rao"
      );
      expect(outputWithExclamation).toContain("Your ticket is resolved!");
      expect(outputWithExclamation).not.toContain("Your ticket is resolved!.");

      const outputWithQuestion = formatDeterministicFallback(
        "can you provide more details?",
        "Alex",
        "Super Admin\nRevanth Rao"
      );
      expect(outputWithQuestion).toContain("Can you provide more details?");
      expect(outputWithQuestion).not.toContain("Can you provide more details?.");
    });
  });

  describe("postProcessPolishedReply", () => {
    const signature = "Super Admin\nRevanth Rao";

    it("replaces generic 'Hello,' with customer name greeting", () => {
      const rawAiText = "Hello,\n\nWe have updated your invoice.\n\nBest regards,\nSuper Admin\nRevanth Rao";
      const processed = postProcessPolishedReply(rawAiText, "Maximilian Koch", signature);

      expect(processed).toContain("Hello Maximilian Koch,");
      expect(processed).not.toContain("Hello,\n\n");
    });

    it("replaces 'Dear customer,' with customer name greeting", () => {
      const rawAiText = "Dear customer,\n\nYour account has been unlocked.\n\nBest regards,\nSuper Admin\nRevanth Rao";
      const processed = postProcessPolishedReply(rawAiText, "Sarah Connor", signature);

      expect(processed).toContain("Hello Sarah Connor,");
      expect(processed).not.toContain("Dear customer,");
    });

    it("prepends customer greeting when model omitted greeting altogether", () => {
      const rawAiText = "We have cleared your browser session cache.\n\nBest regards,\nSuper Admin\nRevanth Rao";
      const processed = postProcessPolishedReply(rawAiText, "David Kim", signature);

      expect(processed.startsWith("Hello David Kim,\n\n")).toBe(true);
      expect(processed).toContain("We have cleared your browser session cache.");
    });

    it("preserves AI output if customer name or first name is already present", () => {
      const rawAiText = "Hi Maximilian,\n\nWe have verified your tax ID.\n\nBest regards,\nSuper Admin\nRevanth Rao";
      const processed = postProcessPolishedReply(rawAiText, "Maximilian Koch", signature);

      expect(processed).toContain("Hi Maximilian,");
      expect(processed).not.toContain("Hello Maximilian Koch,");
    });

    it("appends required signature and Revanth Rao if omitted by AI model", () => {
      const rawAiText = "Hello Student Sam,\n\nYour course access is restored.";
      const processed = postProcessPolishedReply(rawAiText, "Student Sam", signature);

      expect(processed).toContain("Best regards,\nSuper Admin\nRevanth Rao");
    });

    it("replaces generic trailing closings with official signature", () => {
      const rawAiText = "Hello Student Sam,\n\nYour access is restored.\n\nWarm regards,\nSupport Staff";
      const processed = postProcessPolishedReply(rawAiText, "Student Sam", signature);

      expect(processed).toContain("Best regards,\nSuper Admin\nRevanth Rao");
      expect(processed).not.toContain("Warm regards");
      expect(processed).not.toContain("Support Staff");
    });

    it("leaves existing signature untouched when Revanth Rao is already present", () => {
      const rawAiText = "Hello Student Sam,\n\nYour access is active.\n\nBest regards,\nSuper Admin\nRevanth Rao";
      const processed = postProcessPolishedReply(rawAiText, "Student Sam", signature);

      expect(processed).toBe(rawAiText);
    });
  });
});
