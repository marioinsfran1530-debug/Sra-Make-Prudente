ALTER TABLE "Product"
  ADD CONSTRAINT "Product_stockQty_nonnegative"
  CHECK ("stockQty" >= 0);

ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_stockQty_nonnegative"
  CHECK ("stockQty" >= 0);
