import "dotenv/config";
import { startQueue, stopQueue, enqueueTicketClassification } from "../server/src/services/queue.service";
import { ingestInboundEmail } from "../server/src/services/email-ingestion.service";
import { prisma } from "../server/src/db";

async function main() {
  console.log("=======================================================");
  console.log("   Creating Inbound Ticket (Question NOT in KB)       ");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  // Question NOT in Knowledge Base: Corporate team licensing, invoice PO billing, and private team training
  const payload = {
    from: "Sophia Martinez <sophia.martinez@enterprise-tech.io>",
    to: "support@tickethelper.internal",
    subject: "Inquiry about enterprise team training and corporate group licensing",
    text: `Hello Code with Mosh Team,

Our engineering department at Enterprise Tech is planning to onboard 35 software engineers onto modern full-stack development.

We would like to know:
1. Do you offer corporate or enterprise team licenses with centralized administrative billing?
2. Can we pay via corporate Purchase Order (PO) or bank wire transfer rather than credit card?
3. Does Mosh or your senior instructors provide customized live Q&A or private team mentoring workshops?

Looking forward to your guidance!

Best regards,
Sophia Martinez
VP of Engineering, Enterprise Tech`,
    messageId: `<enterprise-inquiry-${timestamp}@enterprise-tech.io>`,
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

  // Enqueue job via PG-Boss
  console.log("4. Enqueueing ticket to PG-Boss 'classify-ticket' queue...");
  const enqueueResult = await enqueueTicketClassification(ticket.id);
  console.log(`   Enqueued via: ${enqueueResult.method} (Job ID: ${enqueueResult.jobId || "in-memory"})\n`);

  // Wait for PG-Boss worker to process evaluation and classification
  console.log("5. Waiting for worker to evaluate against knowledge base and run AI classification...");
  await new Promise((resolve) => setTimeout(resolve, 4000));

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
  console.log("             PROCESSING & EVALUATION RESULT             ");
  console.log("=======================================================\n");
  console.log(`Ticket Number:   #${updatedTicket.ticketNumber}`);
  console.log(`Subject:         ${updatedTicket.subject}`);
  console.log(`Customer:        ${updatedTicket.customerName} <${updatedTicket.customerEmail}>`);
  console.log(`Status:          ${updatedTicket.status.toUpperCase()}`);
  console.log(`Auto-Resolved:   ${updatedTicket.autoResolved ? "YES (True)" : "NO (False)"}`);
  console.log(`Priority:        ${updatedTicket.priority}`);
  console.log(`Total Messages:  ${updatedTicket.messages.length}`);

  const rawPayload = updatedTicket.rawPayload as Record<string, any> | null;

  if (rawPayload?.autoResolutionEscalated) {
    console.log(`\nEscalation / Non-KB Audit:`);
    console.log(`  Reason:        ${rawPayload.autoResolutionEscalated.reason}`);
    console.log(`  Evaluated At:  ${rawPayload.autoResolutionEscalated.evaluatedAt}`);
  }

  if (rawPayload?.aiClassification) {
    console.log(`\nAI Classification Result:`);
    console.log(`  Priority:      ${rawPayload.aiClassification.priority}`);
    console.log(`  Category:      ${rawPayload.aiClassification.category}`);
    console.log(`  Confidence:    ${Math.round((rawPayload.aiClassification.confidence || 0) * 100)}%`);
    console.log(`  Reasoning:     ${rawPayload.aiClassification.reasoning}`);
  }

  const aiMessage = updatedTicket.messages.find((m) => m.senderType === "ai");
  if (aiMessage) {
    console.log("\n[Note] An AI auto-reply message was posted.");
  } else {
    console.log("\n[Confirmed] No AI auto-reply message was posted because the inquiry is outside the knowledge base.");
    console.log("             The ticket remains open in the agent's queue for human triage.");
  }

  // Gracefully stop queue
  await stopQueue();
  console.log("\nDone!");
}

main().catch(console.error);

