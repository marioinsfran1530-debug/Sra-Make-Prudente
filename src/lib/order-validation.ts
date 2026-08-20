export type OrderPriceInput = {
  productPrice: number;
  productPromoPrice?: number | null;
  variantPrice?: number | null;
  variantPromoPrice?: number | null;
};

export function resolveOrderUnitPrice(input: OrderPriceInput): number {
  return (
    input.variantPromoPrice ??
    input.variantPrice ??
    input.productPromoPrice ??
    input.productPrice
  );
}

export function orderItemRequiresVariant(
  activeVariantCount: number,
  variantId: string | null
): boolean {
  return activeVariantCount > 0 && !variantId;
}

export function hasEnoughStock(stockQty: number, requestedQty: number): boolean {
  return Number.isInteger(requestedQty) && requestedQty > 0 && stockQty >= requestedQty;
}

export function orderLineKey(productId: string, variantId: string | null): string {
  return `${productId}:${variantId ?? "base"}`;
}
