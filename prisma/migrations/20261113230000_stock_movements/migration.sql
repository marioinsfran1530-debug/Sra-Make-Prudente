-- Registro de movimentação de estoque: toda mudança em Product."stockQty" e em
-- ProductVariant."stockQty" grava uma linha com o estoque antes/depois, o motivo e,
-- quando o painel informa, quem fez. Vale daqui para frente (não puxa o histórico).
--
-- É um gatilho no banco, então pega qualquer caminho (cadastro do produto, venda,
-- pedido, entrada, estorno ou SQL direto). O aplicativo marca o motivo dentro da
-- transação com set_config('app.stock_reason', ...); sem marca, a mudança é um ajuste
-- manual. Sem chave estrangeira: o histórico continua se o produto for excluído.
-- Tabela privada (schema app_security): só o servidor (Prisma / service_role) acessa.
-- Pode ser reaplicada.

CREATE TABLE IF NOT EXISTS app_security."StockMovement" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "productName" TEXT NOT NULL,
  "variantName" TEXT,
  "delta" INTEGER NOT NULL,
  "stockBefore" INTEGER NOT NULL,
  "stockAfter" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "actorId" TEXT,
  CONSTRAINT "StockMovement_delta_check" CHECK ("delta" <> 0)
);

CREATE INDEX IF NOT EXISTS "StockMovement_productId_idx"
  ON app_security."StockMovement" ("productId", "createdAt" DESC);

ALTER TABLE app_security."StockMovement" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app_security."StockMovement" FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_security TO service_role;
GRANT ALL ON TABLE app_security."StockMovement" TO service_role;

-- Produto sem variação (e produto com variação, que guarda o estoque nas variações).
CREATE OR REPLACE FUNCTION app_security.log_product_stock_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app_security
AS $$
DECLARE
  v_reason TEXT := NULLIF(current_setting('app.stock_reason', true), '');
  v_actor TEXT := NULLIF(current_setting('app.stock_actor', true), '');
  v_before INTEGER;
  v_after INTEGER;
  v_id TEXT;
  v_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_before := 0; v_after := NEW."stockQty"; v_id := NEW."id"; v_name := NEW."name";
    v_reason := COALESCE(v_reason, 'CADASTRO');
  ELSIF TG_OP = 'DELETE' THEN
    v_before := OLD."stockQty"; v_after := 0; v_id := OLD."id"; v_name := OLD."name";
    v_reason := COALESCE(v_reason, 'EXCLUIDO');
  ELSE
    v_before := OLD."stockQty"; v_after := NEW."stockQty"; v_id := NEW."id"; v_name := NEW."name";
    v_reason := COALESCE(v_reason, 'AJUSTE_MANUAL');
  END IF;

  IF v_before IS NOT DISTINCT FROM v_after THEN
    RETURN NULL;
  END IF;

  INSERT INTO app_security."StockMovement"
    ("productId", "productName", "delta", "stockBefore", "stockAfter", "reason", "actorId")
  VALUES
    (v_id, v_name, v_after - v_before, v_before, v_after, v_reason, v_actor);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION app_security.log_variant_stock_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app_security
AS $$
DECLARE
  v_reason TEXT := NULLIF(current_setting('app.stock_reason', true), '');
  v_actor TEXT := NULLIF(current_setting('app.stock_actor', true), '');
  v_before INTEGER;
  v_after INTEGER;
  v_id TEXT;
  v_product_id TEXT;
  v_variant_name TEXT;
  v_product_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_before := 0; v_after := NEW."stockQty"; v_id := NEW."id";
    v_product_id := NEW."productId"; v_variant_name := NEW."name";
    v_reason := COALESCE(v_reason, 'CADASTRO');
  ELSIF TG_OP = 'DELETE' THEN
    v_before := OLD."stockQty"; v_after := 0; v_id := OLD."id";
    v_product_id := OLD."productId"; v_variant_name := OLD."name";
    v_reason := COALESCE(v_reason, 'EXCLUIDO');
  ELSE
    v_before := OLD."stockQty"; v_after := NEW."stockQty"; v_id := NEW."id";
    v_product_id := NEW."productId"; v_variant_name := NEW."name";
    v_reason := COALESCE(v_reason, 'AJUSTE_MANUAL');
  END IF;

  IF v_before IS NOT DISTINCT FROM v_after THEN
    RETURN NULL;
  END IF;

  SELECT "name" INTO v_product_name FROM public."Product" WHERE "id" = v_product_id;

  INSERT INTO app_security."StockMovement"
    ("productId", "variantId", "productName", "variantName", "delta", "stockBefore", "stockAfter", "reason", "actorId")
  VALUES
    (v_product_id, v_id, COALESCE(v_product_name, ''), v_variant_name, v_after - v_before,
     v_before, v_after, v_reason, v_actor);
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION app_security.log_product_stock_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_security.log_variant_stock_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS "Product_stock_log" ON public."Product";
CREATE TRIGGER "Product_stock_log"
  AFTER INSERT OR DELETE OR UPDATE OF "stockQty" ON public."Product"
  FOR EACH ROW EXECUTE FUNCTION app_security.log_product_stock_change();

DROP TRIGGER IF EXISTS "ProductVariant_stock_log" ON public."ProductVariant";
CREATE TRIGGER "ProductVariant_stock_log"
  AFTER INSERT OR DELETE OR UPDATE OF "stockQty" ON public."ProductVariant"
  FOR EACH ROW EXECUTE FUNCTION app_security.log_variant_stock_change();
