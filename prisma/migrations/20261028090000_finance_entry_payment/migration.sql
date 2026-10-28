-- Situação de pagamento das despesas do fechamento do mês.
-- status: PAGO ou PENDENTE (a pagar). dueDate: vencimento. paidAt: data do pagamento.
-- Os lançamentos que já existiam ficam como PAGO, sem datas, como eram contados antes.
ALTER TABLE app_security."FinanceEntry"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PAGO',
  ADD COLUMN IF NOT EXISTS "dueDate" DATE,
  ADD COLUMN IF NOT EXISTS "paidAt" DATE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FinanceEntry_status_check') THEN
    ALTER TABLE app_security."FinanceEntry"
      ADD CONSTRAINT "FinanceEntry_status_check" CHECK ("status" IN ('PAGO', 'PENDENTE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FinanceEntry_paid_check') THEN
    ALTER TABLE app_security."FinanceEntry"
      ADD CONSTRAINT "FinanceEntry_paid_check" CHECK ("status" = 'PAGO' OR "paidAt" IS NULL);
  END IF;
END $$;
