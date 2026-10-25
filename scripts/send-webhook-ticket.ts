import "dotenv/config";
import { startQueue, stopQueue, enqueueTicketClassification } from "../server/src/services/queue.service";
import { ingestInboundEmail } from "../server/src/services/email-ingestion.service";
import { prisma } from "../server/src/db";

async function main() {
  console.log("=======================================================");
  console.log("   Creating Inbound Webhook Ticket from Knowledge Base ");
  console.log("=======================================================\n");

  // Sample Knowledge Base Question (Section 1: Account & Login Issues)
  const payload = {
    from: "David Miller <david.miller@example.com>",
    to: "support@tickethelper.internal",
    subject: "I forgot my password. What should I do?",
    text: "Hello support,\n\nI forgot my password to my Code with Mosh account and I am unable to log in to my courses. Could you please guide me on how to reset it?\n\nThank you,\nDavid Miller",
    messageId: `<pw-reset-${Date.now()}@example.com>`,
    date: new Date().toISOString(),
  };

  console.log("1. Simulating Inbound Webhook payload received from email gateway...");
  console.log(`   From:    ${payload.from}`);
  console.log(`   Subject: ${payload.subject}\n`);

  // Start PG-Boss queue
  console.log("2. Ensuring PG-Boss background queue worker is active...");
  await startQueue();

  // Ingest email (exact logic executed inside POST /api/webhooks/inbound-email)
  console.log("3. Ingesting inbound email and creating initial ticket...");
  const ticket = await ingestInboundEmail(payload);
  console.log(`   Created Ticket #${ticket.ticketNumber} (ID: ${ticket.id})`);
  console.log(`   Initial Status: ${ticket.status}, Priority: ${ticket.priority}\n`);

  // Enqueue job via PG-Boss (exact logic in POST /api/webhooks/inbound-email)
  console.log("4. Enqueueing ticket to PG-Boss 'classify-ticket' queue...");
  const enqueueResult = await enqueueTicketClassification(ticket.id);
  console.log(`   Enqueued via: ${enqueueResult.method} (Job ID: ${enqueueResult.jobId || "in-memory"})\n`);

  // Wait a short moment for PG-Boss worker to claim the job and auto-resolve
  console.log("5. Waiting for PG-Boss worker to process auto-resolution using knowledge-base.md...");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Fetch updated ticket from PostgreSQL
  const updatedTicket = await prisma.ticket.findUnique({
    where: { id: ticket.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!updatedTicket) {
    console.error("Ticket not found after processing!");
    await stopQueue();
    return;
  }

  console.log("\n=======================================================");
  console.log("             AUTO-RESOLUTION RESULT                    ");
  console.log("=======================================================\n");
  console.log(`Ticket Number:  #${updatedTicket.ticketNumber}`);
  console.log(`Subject:        ${updatedTicket.subject}`);
  console.log(`Customer:       ${updatedTicket.customerName} <${updatedTicket.customerEmail}>`);
  console.log(`Final Status:   ${updatedTicket.status.toUpperCase()}`);
  console.log(`Auto-Resolved:  ${updatedTicket.autoResolved ? "YES (True)" : "NO (False)"}`);
  console.log(`Messages Count: ${updatedTicket.messages.length}`);

  const autoResolutionMeta = (updatedTicket.rawPayload as any)?.autoResolution;
  if (autoResolutionMeta) {
    console.log(`Matched KB:     ${autoResolutionMeta.matchedSection}`);
    console.log(`Confidence:     ${Math.round(autoResolutionMeta.confidence * 100)}%`);
    console.log(`Reasoning:      ${autoResolutionMeta.reasoning}`);
  }

  const aiMessage = updatedTicket.messages.find((m) => m.senderType === "ai");
  if (aiMessage) {
    console.log("\n-------------------------------------------------------");
    console.log(`AI Generated Response (from ${aiMessage.senderName}):`);
    console.log("-------------------------------------------------------");
    console.log(aiMessage.bodyText);
    console.log("-------------------------------------------------------");
  }

  // Gracefully stop queue
  await stopQueue();
  console.log("\nDone!");
}

main().catch(console.error);

