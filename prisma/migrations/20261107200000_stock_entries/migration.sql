-- Entradas de estoque (compras recebidas): histórico do que entrou, de onde
-- veio, quanto custou e o estado do estoque/custo antes e depois, para permitir
-- estorno. Tabelas privadas: acessadas apenas pelo servidor (Prisma / service_role).
CREATE TABLE IF NOT EXISTS app_security."StockEntry" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "idempotencyKey" TEXT NOT NULL,
  "entryDate" DATE NOT NULL,
  "origin" TEXT NOT NULL,
  "supplier" TEXT NOT NULL DEFAULT '',
  "freight" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "notes" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'ATIVA',
  "createdById" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "reversedAt" TIMESTAMPTZ,
  "reversedById" TEXT,
  "reversalNote" TEXT,
  CONSTRAINT "StockEntry_idempotencyKey_key" UNIQUE ("idempotencyKey"),
  CONSTRAINT "StockEntry_origin_check" CHECK ("origin" IN ('shopee', 'fornecedor', 'cidade', 'outro')),
  CONSTRAINT "StockEntry_status_check" CHECK ("status" IN ('ATIVA', 'ESTORNADA')),
  CONSTRAINT "StockEntry_freight_check" CHECK ("freight" >= 0),
  CONSTRAINT "StockEntry_supplier_check" CHECK (char_length("supplier") <= 80),
  CONSTRAINT "StockEntry_notes_check" CHECK (char_length("notes") <= 300)
);

CREATE INDEX IF NOT EXISTS "StockEntry_entryDate_idx"
  ON app_security."StockEntry" ("entryDate" DESC, "createdAt" DESC);

-- Cada linha guarda um retrato do produto no momento da entrada (nome, SKU,
-- estoque e custo antes/depois). Sem chave estrangeira para Product: o
-- histórico continua existindo mesmo se o produto for excluído depois.
CREATE TABLE IF NOT EXISTS app_security."StockEntryItem" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "entryId" TEXT NOT NULL REFERENCES app_security."StockEntry"("id") ON DELETE CASCADE,
  "position" INTEGER NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "productName" TEXT NOT NULL,
  "variantName" TEXT,
  "sku" TEXT,
  "qty" INTEGER NOT NULL,
  "unitCost" NUMERIC(10,2) NOT NULL,
  "landedUnitCost" NUMERIC(10,2) NOT NULL,
  "stockBefore" INTEGER NOT NULL,
  "costBefore" NUMERIC(10,2),
  "costAfter" NUMERIC(10,2),
  CONSTRAINT "StockEntryItem_qty_check" CHECK ("qty" BETWEEN 1 AND 9999),
  CONSTRAINT "StockEntryItem_unitCost_check" CHECK ("unitCost" > 0),
  CONSTRAINT "StockEntryItem_landedUnitCost_check" CHECK ("landedUnitCost" > 0)
);

CREATE INDEX IF NOT EXISTS "StockEntryItem_entryId_idx"
  ON app_security."StockEntryItem" ("entryId", "position");
CREATE INDEX IF NOT EXISTS "StockEntryItem_productId_idx"
  ON app_security."StockEntryItem" ("productId");

ALTER TABLE app_security."StockEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_security."StockEntryItem" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE app_security."StockEntry" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE app_security."StockEntryItem" FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_security TO service_role;
GRANT ALL ON TABLE app_security."StockEntry" TO service_role;
GRANT ALL ON TABLE app_security."StockEntryItem" TO service_role;
