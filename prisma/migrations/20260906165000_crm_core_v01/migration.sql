CREATE TYPE "crm_lead_stage" AS ENUM ('NOVO','ATENDIMENTO','PRODUTO_INDICADO','AGUARDANDO_PAGAMENTO','VENDIDO','PERDIDO','POS_VENDA','RECOMPRA');
CREATE TYPE "crm_follow_up_status" AS ENUM ('PENDENTE','CONCLUIDO','CANCELADO');

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
  "source" TEXT,
  "notes" TEXT,
  "lastContactAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");
CREATE INDEX "Customer_lastContactAt_idx" ON "Customer"("lastContactAt");

CREATE TABLE "CrmLead" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "stage" "crm_lead_stage" NOT NULL DEFAULT 'NOVO',
  "productId" TEXT,
  "estimatedValue" DECIMAL(10,2),
  "source" TEXT,
  "notes" TEXT,
  "lostReason" TEXT,
  "assignedToId" TEXT,
  "lastContactAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CrmLead_customerId_stage_idx" ON "CrmLead"("customerId", "stage");
CREATE INDEX "CrmLead_stage_updatedAt_idx" ON "CrmLead"("stage", "updatedAt");
CREATE INDEX "CrmLead_productId_idx" ON "CrmLead"("productId");
CREATE INDEX "CrmLead_assignedToId_idx" ON "CrmLead"("assignedToId");

CREATE TABLE "CrmFollowUp" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "leadId" TEXT,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "crm_follow_up_status" NOT NULL DEFAULT 'PENDENTE',
  "createdById" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmFollowUp_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CrmFollowUp_status_dueAt_idx" ON "CrmFollowUp"("status", "dueAt");
CREATE INDEX "CrmFollowUp_customerId_dueAt_idx" ON "CrmFollowUp"("customerId", "dueAt");
CREATE INDEX "CrmFollowUp_leadId_idx" ON "CrmFollowUp"("leadId");
CREATE INDEX "CrmFollowUp_createdById_idx" ON "CrmFollowUp"("createdById");

ALTER TABLE "Order" ADD COLUMN "customerId" TEXT;
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmFollowUp" ADD CONSTRAINT "CrmFollowUp_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmFollowUp" ADD CONSTRAINT "CrmFollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmFollowUp" ADD CONSTRAINT "CrmFollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmLead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmFollowUp" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Customer" FROM anon, authenticated;
REVOKE ALL ON TABLE "CrmLead" FROM anon, authenticated;
REVOKE ALL ON TABLE "CrmFollowUp" FROM anon, authenticated;
GRANT ALL ON TABLE "Customer", "CrmLead", "CrmFollowUp" TO service_role;

WITH normalized AS (
  SELECT regexp_replace("customerPhone", '\\D', '', 'g') AS phone,
         "customerName" AS name,
         COALESCE("utmSource", "origin", "channel"::text) AS source,
         "createdAt",
         ROW_NUMBER() OVER (PARTITION BY regexp_replace("customerPhone", '\\D', '', 'g') ORDER BY "createdAt" DESC) AS rn
  FROM "Order"
  WHERE regexp_replace("customerPhone", '\\D', '', 'g') <> ''
), latest AS (
  SELECT phone, name, source, "createdAt" FROM normalized WHERE rn = 1
)
INSERT INTO "Customer" ("id", "name", "phone", "source", "lastContactAt", "createdAt", "updatedAt")
SELECT 'cust_' || md5(phone), name, phone, source, "createdAt", "createdAt", CURRENT_TIMESTAMP
FROM latest
ON CONFLICT ("phone") DO NOTHING;

UPDATE "Order" o
SET "customerId" = c."id"
FROM "Customer" c
WHERE c."phone" = regexp_replace(o."customerPhone", '\\D', '', 'g')
  AND o."customerId" IS NULL;
