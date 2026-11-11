-- Entradas de estoque: preço de venda alterado junto com a entrada.
-- Guarda o preço antes e depois de cada item, para o histórico e para o estorno
-- (o preço anterior só volta se ninguém o mudou depois). Nulo = a entrada não
-- mexeu no preço daquele produto. Só acrescenta colunas; pode ser reaplicada.
ALTER TABLE app_security."StockEntryItem"
  ADD COLUMN IF NOT EXISTS "priceBefore" NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS "priceAfter" NUMERIC(10,2);
