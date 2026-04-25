-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "expoPushToken" TEXT;
ALTER TABLE "User" ALTER COLUMN "language" SET DEFAULT 'auto';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'auto';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "avatar" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "expoPushToken" TEXT;

-- Handle Notification/Log Refactoring
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'Notification') 
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'Log') THEN
    ALTER TABLE "Notification" RENAME TO "Log";
    ALTER TABLE "Log" RENAME CONSTRAINT "Notification_pkey" TO "Log_pkey";
  END IF;
END $$;

-- CreateTable Notification
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "senderId" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable NotificationRecipient
CREATE TABLE IF NOT EXISTS "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT,
    "customerId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NotificationRecipient_userId_idx" ON "NotificationRecipient"("userId");
CREATE INDEX IF NOT EXISTS "NotificationRecipient_customerId_idx" ON "NotificationRecipient"("customerId");
CREATE INDEX IF NOT EXISTS "NotificationRecipient_notificationId_idx" ON "NotificationRecipient"("notificationId");

-- AddForeignKey
ALTER TABLE "Log" DROP CONSTRAINT IF EXISTS "Notification_ownerId_fkey";
ALTER TABLE "Log" DROP CONSTRAINT IF EXISTS "Log_ownerId_fkey";
ALTER TABLE "Log" ADD CONSTRAINT "Log_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_ownerId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_senderId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NotificationRecipient" DROP CONSTRAINT IF EXISTS "NotificationRecipient_customerId_fkey";
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NotificationRecipient" DROP CONSTRAINT IF EXISTS "NotificationRecipient_notificationId_fkey";
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationRecipient" DROP CONSTRAINT IF EXISTS "NotificationRecipient_userId_fkey";
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
