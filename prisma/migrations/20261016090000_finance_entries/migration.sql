-- Lançamentos financeiros mensais para o fechamento do mês (despesas fixas,
-- custos variáveis como anúncios e embalagens, e retirada dos sócios).
-- Tabela privada: acessada apenas pelo servidor (Prisma / service_role).
CREATE TABLE IF NOT EXISTS app_security."FinanceEntry" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "month" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "amount" NUMERIC(10,2) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "FinanceEntry_month_check" CHECK ("month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT "FinanceEntry_kind_check" CHECK ("kind" IN ('FIXA', 'VARIAVEL', 'RETIRADA')),
  CONSTRAINT "FinanceEntry_label_check" CHECK (char_length(btrim("label")) BETWEEN 1 AND 80),
  CONSTRAINT "FinanceEntry_amount_check" CHECK ("amount" >= 0)
);

CREATE INDEX IF NOT EXISTS "FinanceEntry_month_idx"
  ON app_security."FinanceEntry" ("month");

ALTER TABLE app_security."FinanceEntry" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE app_security."FinanceEntry" FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_security TO service_role;
GRANT ALL ON TABLE app_security."FinanceEntry" TO service_role;
