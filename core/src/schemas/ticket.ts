import { z } from "zod";

export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/**
 * Parses RFC 2822 sender strings into name and email.
 * e.g. "Jane Doe <jane@example.com>" -> { name: "Jane Doe", email: "jane@example.com" }
 * e.g. "jane@example.com" -> { name: "jane@example.com", email: "jane@example.com" }
 */
export function parseEmailSender(
  input: string | { email: string; name?: string }
): { email: string; name: string } {
  if (typeof input === "object" && input !== null) {
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanName = input.name?.trim() || cleanEmail.split("@")[0] || cleanEmail;
    return { email: cleanEmail, name: cleanName };
  }

  const raw = String(input || "").trim();
  const match = raw.match(/^(?:"?([^"]*)"?\s)?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?$/);

  if (match) {
    const namePart = (match[1] || "").trim();
    const emailPart = match[2].trim().toLowerCase();
    return {
      email: emailPart,
      name: namePart || emailPart.split("@")[0] || emailPart,
    };
  }

  // Fallback
  const fallbackEmail = raw.toLowerCase();
  return {
    email: fallbackEmail,
    name: fallbackEmail.split("@")[0] || fallbackEmail,
  };
}

/**
 * Inbound Email Webhook payload validation schema
 * Compatible with Resend Inbound Webhook / SendGrid Inbound Parse format
 */
export const inboundEmailWebhookSchema = z.object({
  from: z.union([
    z.string().min(1, "Sender 'from' is required"),
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
    }),
  ]),
  to: z.union([
    z.string().min(1),
    z.array(z.string().min(1)),
  ]),
  subject: z.string().default("(No Subject)"),
  text: z.string().optional().default(""),
  html: z.string().optional().default(""),
  messageId: z.string().optional(),
  headers: z.record(z.any()).optional(),
  date: z.union([z.string(), z.date()]).optional(),
});

export type InboundEmailWebhookPayload = z.input<typeof inboundEmailWebhookSchema>;
export type InboundEmailWebhookParsed = z.infer<typeof inboundEmailWebhookSchema>;

/**
 * Schema for simulating an inbound email from development UI or automated test
 */
export const simulateEmailSchema = z.object({
  fromName: z.string().trim().optional(),
  fromEmail: z.string().trim().email("Please enter a valid sender email"),
  to: z.string().trim().email().default("support@yourdomain.com"),
  subject: z.string().trim().min(1, "Subject is required"),
  body: z.string().trim().min(1, "Email body is required"),
});

export type SimulateEmailInput = z.infer<typeof simulateEmailSchema>;

/**
 * Schema for updating ticket properties (status, priority, assigned agent)
 */
export const updateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  assignedToId: z
    .preprocess((val) => (val === "" ? null : val), z.string().uuid().nullable())
    .optional(),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

/**
 * Schema for submitting a new staff reply to a ticket
 */
export const replyTicketSchema = z.object({
  bodyText: z.string().trim().min(1, "Reply message cannot be empty"),
  status: z.enum(TICKET_STATUSES).optional(),
});

export type ReplyTicketInput = z.infer<typeof replyTicketSchema>;


