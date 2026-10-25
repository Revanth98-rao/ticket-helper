/**
 * Customer Support Reply Polishing & Formatting Utilities
 */

/**
 * Derives a clean and respectful customer greeting name from customer name or email.
 * - Prioritizes display name if provided.
 * - Extracts and cleans local-part from email if name is missing or is an email address.
 * - Capitalizes simple lowercase names.
 * - Falls back to "there" when no identifier is available.
 */
export function formatCustomerGreetingName(
  customerName?: string | null,
  customerEmail?: string | null
): string {
  let rawName = (customerName || "").trim();

  if (!rawName && customerEmail) {
    rawName = customerEmail.split("@")[0].trim();
  }
  if (rawName.includes("@")) {
    rawName = rawName.split("@")[0].trim();
  }
  if (rawName && !rawName.includes(" ") && rawName === rawName.toLowerCase()) {
    rawName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  }

  return rawName || "there";
}

/**
 * Formats the replying agent's signature block, ensuring both the agent's name
 * and "Revanth Rao" are represented without duplicate lines.
 */
export function formatAgentSignature(agentName?: string | null): string {
  const cleanAgentName = agentName?.trim() || "Support Agent";
  if (cleanAgentName.toLowerCase().includes("revanth rao")) {
    return cleanAgentName;
  }
  return `${cleanAgentName}\nRevanth Rao`;
}

/**
 * Generates a deterministic, grammatically polished fallback reply
 * used when AI services are offline or running in automated test mode.
 */
export function formatDeterministicFallback(
  draftText: string,
  customerGreetingName: string,
  signatureLines: string
): string {
  const cleanDraft = draftText.trim();
  const capitalized = cleanDraft.charAt(0).toUpperCase() + cleanDraft.slice(1);
  const punctuated = /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;

  const greetingLine =
    customerGreetingName && customerGreetingName !== "there"
      ? `Hello ${customerGreetingName},`
      : "Hello,";

  return `${greetingLine}\n\nThank you for reaching out to us. ${punctuated}\n\nPlease let us know if you need any further assistance.\n\nBest regards,\n${signatureLines}`;
}

/**
 * Post-processes model-generated text to strictly enforce customer name addressing
 * and required sign-off lines (Agent + Revanth Rao).
 */
export function postProcessPolishedReply(
  text: string,
  customerGreetingName: string,
  signatureLines: string
): string {
  let finalPolishedText = text.trim();

  // 1. Ensure customer is addressed by name in greeting
  if (customerGreetingName && customerGreetingName !== "there") {
    const firstName = customerGreetingName.split(" ")[0];
    const hasCustomerName =
      finalPolishedText.toLowerCase().includes(customerGreetingName.toLowerCase()) ||
      (firstName && firstName.length > 1 && finalPolishedText.toLowerCase().includes(firstName.toLowerCase()));

    if (!hasCustomerName) {
      if (/^(?:Hello|Hi|Hey|Dear)(?:\s+there|\s+customer)?,?\s*/i.test(finalPolishedText)) {
        finalPolishedText = finalPolishedText.replace(
          /^(?:Hello|Hi|Hey|Dear)(?:\s+there|\s+customer)?,?\s*/i,
          `Hello ${customerGreetingName},\n\n`
        ).trim();
      } else {
        finalPolishedText = `Hello ${customerGreetingName},\n\n${finalPolishedText}`;
      }
    }
  }

  // 2. Ensure signature lines include agent and Revanth Rao
  if (!finalPolishedText.includes("Revanth Rao")) {
    finalPolishedText = finalPolishedText
      .replace(/\n*(?:Best regards|Warm regards|Sincerely|Thanks|Thank you|Regards),?[\s\S]*$/i, "")
      .trim();
    finalPolishedText = `${finalPolishedText}\n\nBest regards,\n${signatureLines}`;
  }

  return finalPolishedText;
}

export interface TicketSummarySource {
  ticketNumber: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  customerName?: string | null;
  customerEmail: string;
}

export interface TicketMessageSummarySource {
  id: string;
  senderType: string;
  senderName?: string | null;
  senderEmail: string;
  bodyText: string;
  createdAt: Date | string;
}

/**
 * Builds a readable transcript of the ticket and its conversation messages
 * formatted for AI prompt ingestion.
 */
export function buildConversationTranscript(
  ticket: TicketSummarySource,
  messages: TicketMessageSummarySource[] = []
): string {
  if (!messages || messages.length === 0) {
    return `[Initial Message] Customer (${ticket.customerName || ticket.customerEmail}):\n${ticket.description}`;
  }

  return messages
    .map((msg, index) => {
      const senderRole = msg.senderType === "agent" ? "Staff" : "Customer";
      const senderIdentifier = msg.senderName || msg.senderEmail;
      return `[Message ${index + 1} - ${senderRole} (${senderIdentifier})]:\n${msg.bodyText.trim()}`;
    })
    .join("\n\n");
}

/**
 * Produces a deterministic structured summary for test environments
 * or when AI providers are unavailable.
 */
export function formatDeterministicSummary(
  ticket: TicketSummarySource,
  messages: TicketMessageSummarySource[] = []
): string {
  const customerLabel = ticket.customerName || ticket.customerEmail;
  const messageCount = messages.length > 0 ? messages.length : 1;
  const hasAgentReply = messages.some((m) => m.senderType === "agent");

  const cleanDescription = ticket.description.trim();
  const truncatedDesc =
    cleanDescription.length > 180
      ? `${cleanDescription.slice(0, 180)}...`
      : cleanDescription;

  const currentAction = hasAgentReply
    ? "Staff has responded with troubleshooting guidance."
    : "Awaiting staff response and triage.";

  return [
    `• Issue: Customer (${customerLabel}) reported: "${ticket.subject}".`,
    `• Key Details: ${truncatedDesc}`,
    `• Status & Next Steps: Marked as ${ticket.status.toUpperCase()} (${ticket.priority} priority). Conversation has ${messageCount} message(s). ${currentAction}`,
  ].join("\n");
}


