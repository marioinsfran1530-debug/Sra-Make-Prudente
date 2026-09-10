CREATE SCHEMA IF NOT EXISTS app_security;

CREATE TABLE IF NOT EXISTS app_security."PaymentSettings" (
  "id" TEXT PRIMARY KEY,
  "config" JSONB NOT NULL DEFAULT '{"providers":[]}'::jsonb,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_security."PaymentSettings" ("id")
VALUES ('default')
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS app_security."OrderPaymentFinancial" (
  "orderPaymentId" TEXT PRIMARY KEY REFERENCES public."OrderPayment"("id") ON DELETE CASCADE,
  "providerId" TEXT,
  "providerName" TEXT,
  "channel" TEXT NOT NULL,
  "installments" INTEGER NOT NULL DEFAULT 1,
  "feeRate" NUMERIC(7,4) NOT NULL DEFAULT 0,
  "feeAmount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "netAmount" NUMERIC(10,2) NOT NULL,
  "settlementStatus" TEXT NOT NULL DEFAULT 'RECEBIDO',
  "settlementDays" INTEGER NOT NULL DEFAULT 0,
  "expectedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "OrderPaymentFinancial_installments_check" CHECK ("installments" BETWEEN 1 AND 24),
  CONSTRAINT "OrderPaymentFinancial_fee_rate_check" CHECK ("feeRate" BETWEEN 0 AND 100),
  CONSTRAINT "OrderPaymentFinancial_settlement_days_check" CHECK ("settlementDays" BETWEEN 0 AND 3650),
  CONSTRAINT "OrderPaymentFinancial_channel_check" CHECK ("channel" IN ('MACHINE', 'LINK')),
  CONSTRAINT "OrderPaymentFinancial_status_check" CHECK ("settlementStatus" IN ('RECEBIDO', 'A_RECEBER'))
);

CREATE INDEX IF NOT EXISTS "OrderPaymentFinancial_expectedAt_idx"
  ON app_security."OrderPaymentFinancial" ("settlementStatus", "expectedAt");

REVOKE ALL ON TABLE app_security."PaymentSettings" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE app_security."OrderPaymentFinancial" FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_security TO service_role;
GRANT ALL ON TABLE app_security."PaymentSettings" TO service_role;
GRANT ALL ON TABLE app_security."OrderPaymentFinancial" TO service_role;
