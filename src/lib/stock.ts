export type StockStatus = "DISPONIVEL" | "ULTIMAS" | "INDISPONIVEL";

// Regra única do plano (seção 5): o rótulo de estoque é sempre CALCULADO
// a partir da quantidade — nunca digitado manualmente pelo admin.
export function computeStockStatus(qty: number): StockStatus {
  if (qty <= 0) return "INDISPONIVEL";
  if (qty <= 5) return "ULTIMAS";
  return "DISPONIVEL";
}

// Estoque exibido no card do produto: se houver variantes ativas, usa a
// mais favorável entre elas; senão usa o stockQty do próprio produto.
export function productStockStatus(product: {
  stockQty: number;
  variants?: { stockQty: number; active: boolean }[];
}): StockStatus {
  if (product.variants && product.variants.length > 0) {
    const activeVariants = product.variants.filter((v) => v.active);
    if (activeVariants.length === 0) return "INDISPONIVEL";
    const best = Math.max(...activeVariants.map((v) => v.stockQty));
    return computeStockStatus(best);
  }
  return computeStockStatus(product.stockQty);
}

export const STOCK_LABEL: Record<StockStatus, string> = {
  DISPONIVEL: "Disponível",
  ULTIMAS: "Últimas unidades",
  INDISPONIVEL: "Indisponível",
};
