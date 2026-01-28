-- AlterTable
ALTER TABLE "User" ADD COLUMN     "radiusPool" TEXT DEFAULT '',
ADD COLUMN     "isAutoIsolationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoIsolationDate" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "isolationType" TEXT NOT NULL DEFAULT 'disable';

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "speedUp" INTEGER NOT NULL DEFAULT 0,
    "speedDown" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "ownerId" TEXT,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radcheck" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "attribute" TEXT NOT NULL DEFAULT '',
    "op" TEXT NOT NULL DEFAULT '==',
    "value" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "radcheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radreply" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "attribute" TEXT NOT NULL DEFAULT '',
    "op" TEXT NOT NULL DEFAULT '=',
    "value" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "radreply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radgroupcheck" (
    "id" SERIAL NOT NULL,
    "groupname" TEXT NOT NULL,
    "attribute" TEXT NOT NULL DEFAULT '',
    "op" TEXT NOT NULL DEFAULT '==',
    "value" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "radgroupcheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radgroupreply" (
    "id" SERIAL NOT NULL,
    "groupname" TEXT NOT NULL,
    "attribute" TEXT NOT NULL DEFAULT '',
    "op" TEXT NOT NULL DEFAULT '=',
    "value" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "radgroupreply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radusergroup" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "groupname" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "radusergroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radacct" (
    "radacctid" BIGSERIAL NOT NULL,
    "acctsessionid" TEXT NOT NULL DEFAULT '',
    "acctuniqueid" TEXT NOT NULL DEFAULT '',
    "username" TEXT NOT NULL DEFAULT '',
    "realm" TEXT DEFAULT '',
    "nasipaddress" TEXT NOT NULL DEFAULT '',
    "nasportid" TEXT DEFAULT '',
    "nasporttype" TEXT DEFAULT '',
    "acctstarttime" TIMESTAMP(3),
    "acctupdatetime" TIMESTAMP(3),
    "acctstoptime" TIMESTAMP(3),
    "acctinterval" INTEGER,
    "acctsessiontime" INTEGER,
    "acctauthentic" TEXT,
    "connectinfo_start" TEXT,
    "connectinfo_stop" TEXT,
    "acctinputoctets" BIGINT,
    "acctoutputoctets" BIGINT,
    "calledstationid" TEXT NOT NULL DEFAULT '',
    "callingstationid" TEXT NOT NULL DEFAULT '',
    "acctterminatecause" TEXT NOT NULL DEFAULT '',
    "servicetype" TEXT,
    "framedprotocol" TEXT,
    "framedipaddress" TEXT,

    CONSTRAINT "radacct_pkey" PRIMARY KEY ("radacctid")
);

-- CreateTable
CREATE TABLE "nas" (
    "id" SERIAL NOT NULL,
    "nasname" TEXT NOT NULL,
    "shortname" TEXT,
    "type" TEXT NOT NULL DEFAULT 'other',
    "ports" INTEGER,
    "secret" TEXT NOT NULL DEFAULT 'secret',
    "server" TEXT,
    "community" TEXT,
    "description" TEXT,

    CONSTRAINT "nas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radpostauth" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "pass" TEXT NOT NULL,
    "reply" TEXT NOT NULL,
    "authdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "radpostauth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentGatewayConfig" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'midtrans',
    "isSandbox" BOOLEAN NOT NULL DEFAULT true,
    "merchantId" TEXT,
    "clientKey" TEXT,
    "serverKey" TEXT,
    "webhookSecret" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGatewayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_name_key" ON "Profile"("name");

-- CreateIndex
CREATE INDEX "username_idx" ON "radcheck"("username");

-- CreateIndex
CREATE INDEX "reply_username_idx" ON "radreply"("username");

-- CreateIndex
CREATE INDEX "groupcheck_idx" ON "radgroupcheck"("groupname");

-- CreateIndex
CREATE INDEX "groupreply_idx" ON "radgroupreply"("groupname");

-- CreateIndex
CREATE INDEX "usergroup_username_idx" ON "radusergroup"("username");

-- CreateIndex
CREATE UNIQUE INDEX "acctuniqueid_unique" ON "radacct"("acctuniqueid");

-- CreateIndex
CREATE INDEX "radacct_username_idx" ON "radacct"("username");

-- CreateIndex
CREATE INDEX "radacct_start_idx" ON "radacct"("acctstarttime");

-- CreateIndex
CREATE INDEX "radacct_stop_idx" ON "radacct"("acctstoptime");

-- CreateIndex
CREATE INDEX "radacct_nasip_idx" ON "radacct"("nasipaddress");

-- CreateIndex
CREATE INDEX "radacct_framedip_idx" ON "radacct"("framedipaddress");

-- CreateIndex
CREATE UNIQUE INDEX "nas_nasname_key" ON "nas"("nasname");

-- CreateIndex
CREATE INDEX "nas_nasname_idx" ON "nas"("nasname");

-- CreateIndex
CREATE INDEX "postauth_idx" ON "radpostauth"("username", "authdate");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayConfig_ownerId_key" ON "PaymentGatewayConfig"("ownerId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD COLUMN "profileId" TEXT;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentGatewayConfig" ADD CONSTRAINT "PaymentGatewayConfig_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
