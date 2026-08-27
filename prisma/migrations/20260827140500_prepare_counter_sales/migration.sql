ALTER TYPE "payment_method" ADD VALUE IF NOT EXISTS 'DEBITO';
ALTER TYPE "payment_method" ADD VALUE IF NOT EXISTS 'CREDITO';

DO $$ BEGIN
  CREATE TYPE "order_channel" AS ENUM ('CATALOGO', 'WHATSAPP', 'LOJA_FISICA', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "channel" "order_channel" NOT NULL DEFAULT 'CATALOGO',
  ADD COLUMN IF NOT EXISTS "createdById" TEXT;

CREATE TABLE IF NOT EXISTS "OrderPayment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "method" "payment_method" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderPayment_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Order"
    ADD CONSTRAINT "Order_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrderPayment"
    ADD CONSTRAINT "OrderPayment_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "Order_channel_createdAt_idx" ON "Order"("channel", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_createdById_createdAt_idx" ON "Order"("createdById", "createdAt");
CREATE INDEX IF NOT EXISTS "OrderPayment_orderId_idx" ON "OrderPayment"("orderId");
CREATE INDEX IF NOT EXISTS "OrderPayment_method_createdAt_idx" ON "OrderPayment"("method", "createdAt");
