import { estimatedCost } from "./pricing";

// Janela de vendas usada para medir o giro de cada produto.
export const SALES_WINDOW_DAYS = 30;

// Prazo de chegada por origem de compra. É um valor único por origem, escolhido
// na tela de compras (o cadastro de fornecedor por produto ainda não existe).
export const SUPPLY_ORIGINS = [
  { value: "shopee", label: "Shopee", leadDays: 7 },
  { value: "fornecedor", label: "Fornecedor (Sedex)", leadDays: 3 },
  { value: "cidade", label: "Compra na cidade", leadDays: 1 },
] as const;

export type SupplyOrigin = (typeof SUPPLY_ORIGINS)[number]["value"];

export const HORIZON_OPTIONS = [15, 30] as const;
export type HorizonDays = (typeof HORIZON_OPTIONS)[number];

export function parseSupplyOrigin(value: unknown): (typeof SUPPLY_ORIGINS)[number] {
  return SUPPLY_ORIGINS.find((item) => item.value === value) ?? SUPPLY_ORIGINS[0];
}

export function parseHorizon(value: unknown): HorizonDays {
  const parsed = Number(value);
  return (HORIZON_OPTIONS as readonly number[]).includes(parsed) ? (parsed as HorizonDays) : 30;
}

export type PurchaseInput = {
  stockQty: number;
  unitsSold: number; // unidades vendidas na janela
  price: number;
  costPrice: number | null;
};

export type PurchaseOptions = {
  horizonDays: number; // por quantos dias a compra deve durar depois de chegar
  leadDays: number; // dias até a mercadoria chegar
  windowDays?: number;
};

export type PurchaseSuggestion = {
  dailySales: number;
  // Dias que o estoque atual dura no ritmo de venda; null quando não há venda.
  coverageDays: number | null;
  // O estoque acaba antes de a compra chegar.
  urgent: boolean;
  suggestedQty: number;
  unitCost: number;
  costIsEstimated: boolean;
  lineTotal: number;
};

export function unitCostOf(price: number, costPrice: number | null) {
  return costPrice !== null
    ? { unitCost: costPrice, costIsEstimated: false }
    : { unitCost: estimatedCost(price), costIsEstimated: true };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

// Compra sugerida: cobre os dias até chegar (leadDays) mais o horizonte
// escolhido (15 ou 30 dias), descontando o estoque que já existe.
export function suggestPurchase(input: PurchaseInput, options: PurchaseOptions): PurchaseSuggestion {
  const windowDays = options.windowDays ?? SALES_WINDOW_DAYS;
  const stock = Math.max(0, input.stockQty);
  const dailySales = Math.max(0, input.unitsSold) / windowDays;
  const coverageDays = dailySales > 0 ? stock / dailySales : null;

  const target = dailySales * (options.leadDays + options.horizonDays);
  const gap = Math.round((target - stock) * 1e6) / 1e6;
  const suggestedQty = gap > 0 ? Math.ceil(gap) : 0;

  const { unitCost, costIsEstimated } = unitCostOf(input.price, input.costPrice);

  return {
    dailySales,
    coverageDays,
    urgent: coverageDays !== null && coverageDays < options.leadDays,
    suggestedQty,
    unitCost,
    costIsEstimated,
    lineTotal: round2(suggestedQty * unitCost),
  };
}

// Dinheiro parado em estoque: quantidade em mãos vezes o custo (real ou estimado).
export function stockValue(input: { stockQty: number; price: number; costPrice: number | null }) {
  const { unitCost, costIsEstimated } = unitCostOf(input.price, input.costPrice);
  const stock = Math.max(0, input.stockQty);
  return { unitCost, costIsEstimated, value: round2(stock * unitCost) };
}
