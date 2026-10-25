import { describe, it, expect } from "bun:test";
import {
  buildConversationTranscript,
  formatDeterministicSummary,
  TicketSummarySource,
  TicketMessageSummarySource,
} from "../server/src/services/polish-formatter.service";

describe("Ticket & Conversation Summarizer Service", () => {
  const sampleTicket: TicketSummarySource = {
    ticketNumber: 42,
    subject: "Cannot access assignment syllabus",
    description: "I get a 403 Forbidden error whenever I try to download the course syllabus from the student portal.",
    status: "open",
    priority: "high",
    customerName: "Student Sam",
    customerEmail: "student.sam@university.edu",
  };

  describe("buildConversationTranscript", () => {
    it("creates a transcript from the initial ticket when no messages exist", () => {
      const transcript = buildConversationTranscript(sampleTicket, []);
      expect(transcript).toContain("Student Sam");
      expect(transcript).toContain("403 Forbidden error");
    });

    it("formats conversation thread with both Customer and Staff messages", () => {
      const messages: TicketMessageSummarySource[] = [
        {
          id: "msg-1",
          senderType: "customer",
          senderName: "Student Sam",
          senderEmail: "student.sam@university.edu",
          bodyText: "I get a 403 Forbidden error on the syllabus.",
          createdAt: new Date("2026-10-25T01:00:00Z"),
        },
        {
          id: "msg-2",
          senderType: "agent",
          senderName: "Super Admin",
          senderEmail: "admin@tickethelper.internal",
          bodyText: "We updated your course enrollment permissions. Please refresh.",
          createdAt: new Date("2026-10-25T01:15:00Z"),
        },
        {
          id: "msg-3",
          senderType: "customer",
          senderName: "Student Sam",
          senderEmail: "student.sam@university.edu",
          bodyText: "Thank you! I can view it now.",
          createdAt: new Date("2026-10-25T01:20:00Z"),
        },
      ];

      const transcript = buildConversationTranscript(sampleTicket, messages);

      expect(transcript).toContain("[Message 1 - Customer (Student Sam)]:\nI get a 403 Forbidden error on the syllabus.");
      expect(transcript).toContain("[Message 2 - Staff (Super Admin)]:\nWe updated your course enrollment permissions. Please refresh.");
      expect(transcript).toContain("[Message 3 - Customer (Student Sam)]:\nThank you! I can view it now.");
    });
  });

  describe("formatDeterministicSummary", () => {
    it("generates structured summary for a new ticket awaiting staff triage", () => {
      const summary = formatDeterministicSummary(sampleTicket, []);

      expect(summary).toContain("• Issue: Customer (Student Sam) reported: \"Cannot access assignment syllabus\".");
      expect(summary).toContain("• Key Details: I get a 403 Forbidden error");
      expect(summary).toContain("• Status & Next Steps: Marked as OPEN (high priority).");
      expect(summary).toContain("Awaiting staff response and triage.");
    });

    it("regenerates updated summary reflecting new staff replies and resolution", () => {
      const initialSummary = formatDeterministicSummary(sampleTicket, [
        {
          id: "msg-1",
          senderType: "customer",
          senderName: "Student Sam",
          senderEmail: "student.sam@university.edu",
          bodyText: "Initial issue",
          createdAt: new Date(),
        },
      ]);
      expect(initialSummary).toContain("Awaiting staff response and triage.");
      expect(initialSummary).toContain("Conversation has 1 message(s)");

      // Agent replies and status updates to resolved
      const updatedTicket: TicketSummarySource = {
        ...sampleTicket,
        status: "resolved",
      };
      const updatedMessages: TicketMessageSummarySource[] = [
        {
          id: "msg-1",
          senderType: "customer",
          senderName: "Student Sam",
          senderEmail: "student.sam@university.edu",
          bodyText: "Initial issue",
          createdAt: new Date(),
        },
        {
          id: "msg-2",
          senderType: "agent",
          senderName: "Support Agent",
          senderEmail: "agent@tickethelper.internal",
          bodyText: "Fixed permissions",
          createdAt: new Date(),
        },
      ];

      const regeneratedSummary = formatDeterministicSummary(updatedTicket, updatedMessages);

      expect(regeneratedSummary).toContain("Marked as RESOLVED");
      expect(regeneratedSummary).toContain("Conversation has 2 message(s)");
      expect(regeneratedSummary).toContain("Staff has responded with troubleshooting guidance.");
      expect(regeneratedSummary).not.toBe(initialSummary);
    });

    it("truncates long descriptions gracefully", () => {
      const longTicket: TicketSummarySource = {
        ...sampleTicket,
        description: "A".repeat(300),
      };

      const summary = formatDeterministicSummary(longTicket, []);
      expect(summary).toContain("...");
      expect(summary.length).toBeLessThan(400);
    });
  });
});

