// Regra de precificação da loja: o custo representa ~44% do preço de venda
// (margem bruta de ~56%). Enquanto o custo real não é cadastrado, o painel usa
// essa regra como ESTIMATIVA e sempre sinaliza que o valor é estimado.
export const ESTIMATED_COST_RATIO = 0.44;

// Margem mínima aceitável por produto (referência de mercado: dobrar o custo).
export const MIN_MARGIN_PCT = 50;

export function estimatedCost(price: number) {
  return Math.round(price * ESTIMATED_COST_RATIO * 100) / 100;
}

export function marginPct(price: number, cost: number) {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return ((price - cost) / price) * 100;
}
