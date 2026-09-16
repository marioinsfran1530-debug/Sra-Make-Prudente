ALTER TABLE "Order"
  ADD COLUMN "cancelReasonCode" TEXT,
  ADD COLUMN "cancelReasonText" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledById" TEXT,
  ADD COLUMN "refundStatus" TEXT,
  ADD COLUMN "refundUpdatedAt" TIMESTAMP(3);

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_cancelledById_fkey"
  FOREIGN KEY ("cancelledById") REFERENCES "AdminProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_cancelReasonCode_check"
  CHECK (
    "cancelReasonCode" IS NULL OR "cancelReasonCode" IN (
      'CUSTOMER_WITHDREW',
      'WRONG_PRODUCT',
      'WRONG_QUANTITY',
      'WRONG_PRICE_DISCOUNT',
      'WRONG_PAYMENT_METHOD',
      'DUPLICATE_SALE',
      'OTHER'
    )
  );

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_refundStatus_check"
  CHECK ("refundStatus" IS NULL OR "refundStatus" IN ('PENDING', 'REFUNDED', 'NOT_REQUIRED'));

CREATE INDEX "Order_cancelledAt_idx" ON "Order"("cancelledAt");
CREATE INDEX "Order_refundStatus_idx" ON "Order"("refundStatus");
