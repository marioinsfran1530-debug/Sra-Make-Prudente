DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Product_stockQty_nonnegative'
  ) THEN
    ALTER TABLE "Product"
      ADD CONSTRAINT "Product_stockQty_nonnegative"
      CHECK ("stockQty" >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductVariant_stockQty_nonnegative'
  ) THEN
    ALTER TABLE "ProductVariant"
      ADD CONSTRAINT "ProductVariant_stockQty_nonnegative"
      CHECK ("stockQty" >= 0);
  END IF;
END $$;
