import { prisma } from "../db";
import {
  parseEmailSender,
  InboundEmailWebhookPayload,
} from "core/schemas/ticket";

export interface IngestedTicketResult {
  id: string;
  ticketNumber: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  customerEmail: string;
  customerName: string | null;
  recipientEmail: string;
  source: string;
  createdAt: Date;
  messagesCount: number;
}

/**
 * Strips HTML tags to produce readable plain text when only HTML is available.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes email recipient address into a single clean email string.
 */
function extractRecipientEmail(toField: string | string[]): string {
  if (Array.isArray(toField)) {
    const first = toField[0] || "";
    return parseEmailSender(first).email;
  }
  return parseEmailSender(toField).email;
}

/**
 * Ingests an inbound email payload and converts it into a new support ticket
 * with an associated initial customer message.
 */
export async function ingestInboundEmail(
  payload: InboundEmailWebhookPayload
): Promise<IngestedTicketResult> {
  const sender = parseEmailSender(payload.from);

  if (!sender.email || !sender.email.includes("@")) {
    throw new Error(`Invalid sender email address: '${sender.email}'`);
  }

  const recipientEmail =
    extractRecipientEmail(payload.to) ||
    process.env.EMAIL_FROM ||
    "support@yourdomain.com";

  // Clean and prepare body text
  let bodyText = (payload.text || "").trim();
  if (!bodyText && payload.html) {
    bodyText = stripHtml(payload.html);
  }
  if (!bodyText) {
    bodyText = "(Empty email body)";
  }

  const cleanSubject = (payload.subject || "").trim() || "(No Subject)";

  // Create Ticket and initial TicketMessage atomically in PostgreSQL
  const ticket = await prisma.$transaction(async (tx) => {
    const createdTicket = await tx.ticket.create({
      data: {
        subject: cleanSubject,
        description: bodyText,
        status: "open",
        priority: "medium",
        customerEmail: sender.email,
        customerName: sender.name,
        recipientEmail: recipientEmail,
        source: "email",
        messageId: payload.messageId || null,
        rawPayload: payload as any,
        messages: {
          create: {
            senderType: "customer",
            senderEmail: sender.email,
            senderName: sender.name,
            bodyText: bodyText,
            bodyHtml: payload.html || null,
            messageId: payload.messageId || null,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    return createdTicket;
  });

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    customerEmail: ticket.customerEmail,
    customerName: ticket.customerName,
    recipientEmail: ticket.recipientEmail,
    source: ticket.source,
    createdAt: ticket.createdAt,
    messagesCount: ticket.messages.length,
  };
}

