-- Migration to synchronize Ticket, TicketMessage, and missing gateway / customer / registration fields

-- 1. Alter Table Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "identityNumber" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "coordinates" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "comment" TEXT;

-- 2. Alter Table Registration
ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "identityNumber" TEXT;
ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "coordinates" TEXT;
ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "technicianId" TEXT;
ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "routerIds" TEXT;

-- 3. Alter Table Payment
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "gatewayStatus" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentType" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "transactionId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentUrl" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "expiryTime" TIMESTAMP(3);

-- 4. Alter Table Notification
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "ticketId" TEXT;

-- 5. Create Ticket Table
CREATE TABLE IF NOT EXISTS "Ticket" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'umum',
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "customerId" TEXT NOT NULL,
    "technicianId" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- 6. Create TicketMessage Table
CREATE TABLE IF NOT EXISTS "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- 7. Create Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_ticketId_key" ON "Ticket"("ticketId");
CREATE INDEX IF NOT EXISTS "Ticket_customerId_idx" ON "Ticket"("customerId");
CREATE INDEX IF NOT EXISTS "Ticket_technicianId_idx" ON "Ticket"("technicianId");
CREATE INDEX IF NOT EXISTS "Ticket_status_idx" ON "Ticket"("status");

CREATE INDEX IF NOT EXISTS "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");
CREATE INDEX IF NOT EXISTS "TicketMessage_isRead_idx" ON "TicketMessage"("isRead");

CREATE INDEX IF NOT EXISTS "Notification_ticketId_idx" ON "Notification"("ticketId");

-- 8. Add Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Ticket_customerId_fkey'
    ) THEN
        ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Ticket_technicianId_fkey'
    ) THEN
        ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TicketMessage_ticketId_fkey'
    ) THEN
        ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Notification_ticketId_fkey'
    ) THEN
        ALTER TABLE "Notification" ADD CONSTRAINT "Notification_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
