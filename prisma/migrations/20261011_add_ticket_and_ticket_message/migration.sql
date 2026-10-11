-- CreateTable
CREATE TABLE "ticket" (
    "id" TEXT NOT NULL,
    "ticketNumber" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "assignedToId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'email',
    "messageId" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_message" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL DEFAULT 'customer',
    "senderEmail" TEXT NOT NULL,
    "senderName" TEXT,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_ticketNumber_key" ON "ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "ticket_status_idx" ON "ticket"("status");

-- CreateIndex
CREATE INDEX "ticket_customerEmail_idx" ON "ticket"("customerEmail");

-- CreateIndex
CREATE INDEX "ticket_message_ticketId_idx" ON "ticket_message"("ticketId");

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

