CREATE TABLE app_security."OrderMiscCharge" (
  "orderId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrderMiscCharge_pkey" PRIMARY KEY ("orderId"),
  CONSTRAINT "OrderMiscCharge_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderMiscCharge_amount_check" CHECK ("amount" >= 0)
);

ALTER TABLE app_security."OrderMiscCharge" ENABLE ROW LEVEL SECURITY;
