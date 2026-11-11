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

// ---- Sugestão de preço de venda ----

// Preço "de varejo" mais próximo terminando em ,90 (ex.: 31,82 → 31,90).
export function roundToNinety(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0.9;
  const whole = Math.max(0, Math.round(value - 0.9));
  return Math.round((whole + 0.9) * 100) / 100;
}

// Preço sugerido para um custo: aplica a regra da loja (custo = 44% do preço),
// arredonda para ,90 e, se o arredondamento deixar a margem abaixo do mínimo,
// sobe para o próximo ,90.
export function suggestedPrice(cost: number) {
  if (!Number.isFinite(cost) || cost <= 0) return null;
  let price = roundToNinety(cost / ESTIMATED_COST_RATIO);
  while (marginPct(price, cost) < MIN_MARGIN_PCT) price = Math.round((price + 1) * 100) / 100;
  return price;
}

export type PriceAdvice = {
  margin: number; // margem bruta (%) do preço atual com o custo informado
  low: boolean; // abaixo da margem mínima
  suggested: number | null; // preço sugerido (null se não houver custo)
  suggestedMargin: number | null;
};

// Compara o preço atual com o custo (já o novo custo médio, na entrada).
export function priceAdvice(price: number, cost: number): PriceAdvice {
  const suggested = suggestedPrice(cost);
  const margin = marginPct(price, cost);
  return {
    margin,
    low: !(price > 0) || margin < MIN_MARGIN_PCT,
    suggested,
    suggestedMargin: suggested === null ? null : marginPct(suggested, cost),
  };
}
