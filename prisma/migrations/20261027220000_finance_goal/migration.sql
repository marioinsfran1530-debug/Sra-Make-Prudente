-- Meta mensal do fechamento do mês: lucro desejado e, opcionalmente, uma meta
-- de vendas digitada que substitui a meta calculada pelo painel.
-- Tabela privada: acessada apenas pelo servidor (Prisma / service_role).
CREATE TABLE IF NOT EXISTS app_security."FinanceGoal" (
  "month" TEXT PRIMARY KEY,
  "desiredProfit" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "goalOverride" NUMERIC(12,2),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "FinanceGoal_month_check" CHECK ("month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT "FinanceGoal_desiredProfit_check" CHECK ("desiredProfit" >= 0),
  CONSTRAINT "FinanceGoal_goalOverride_check" CHECK ("goalOverride" IS NULL OR "goalOverride" > 0)
);

ALTER TABLE app_security."FinanceGoal" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE app_security."FinanceGoal" FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_security TO service_role;
GRANT ALL ON TABLE app_security."FinanceGoal" TO service_role;
