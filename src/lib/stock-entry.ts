// Entradas de estoque (compras recebidas). Tudo aqui é puro (sem banco) para
// poder ser testado; o acesso ao banco fica em stock-entry-data.ts.
//
// Regras:
// - Cada entrada tem várias linhas (produto ou variação + quantidade + custo
//   unitário pago) e um frete opcional. O frete é rateado entre as linhas
//   proporcionalmente ao valor de cada uma e entra no custo ("custo com frete").
// - O custo do produto passa a ser a média ponderada entre o que já havia em
//   estoque e o que está entrando. Sem custo anterior (ou sem estoque), o custo
//   passa a ser o da entrada.
// - Estorno devolve o estoque e, se o custo do produto não mudou depois, também
//   o custo anterior.

import { parseMoneyText } from "./money-text";

export const ENTRY_ORIGINS = [
  { value: "shopee", label: "Shopee" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "cidade", label: "Compra na cidade" },
  { value: "outro", label: "Outro" },
] as const;

export type EntryOrigin = (typeof ENTRY_ORIGINS)[number]["value"];

export const MAX_ENTRY_LINES = 100;
export const MAX_LINE_QTY = 9999;
export const MAX_UNIT_COST = 99999.99;
export const MAX_FREIGHT = 99999.99;

export function isEntryOrigin(value: unknown): value is EntryOrigin {
  return ENTRY_ORIGINS.some((origin) => origin.value === value);
}

export function entryOriginLabel(value: string) {
  return ENTRY_ORIGINS.find((origin) => origin.value === value)?.label ?? value;
}

export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type EntryLineInput = {
  productId: string;
  variantId: string | null;
  qty: number;
  unitCost: number;
};

export type NormalizedEntry = {
  idempotencyKey: string;
  entryDate: string; // AAAA-MM-DD
  origin: EntryOrigin;
  supplier: string;
  freight: number;
  notes: string;
  lines: EntryLineInput[];
};

type Parsed = { error: string } | { value: NormalizedEntry };

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseMoneyText(value);
  return Number.NaN;
}

// `today` (AAAA-MM-DD, horário de Brasília) vem de quem chama, para a regra
// "não pode ser data futura" não depender do relógio do servidor aqui dentro.
export function parseEntryInput(raw: unknown, today: string): Parsed {
  if (!raw || typeof raw !== "object") return { error: "Dados da entrada inválidos." };
  const body = raw as Record<string, unknown>;

  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim().slice(0, 160) : "";
  if (idempotencyKey.length < 8) {
    return { error: "Identificador da entrada inválido. Atualize a tela e tente novamente." };
  }

  const entryDate = typeof body.entryDate === "string" ? body.entryDate.trim() : "";
  if (!isIsoDate(entryDate) || entryDate < "2020-01-01") return { error: "Informe uma data válida." };
  if (entryDate > today) return { error: "A data da entrada não pode ser no futuro." };

  const origin = isEntryOrigin(body.origin) ? body.origin : null;
  if (!origin) return { error: "Escolha de onde veio a compra." };

  const supplier = typeof body.supplier === "string" ? body.supplier.trim().slice(0, 80) : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 300) : "";

  const freight = body.freight === undefined || body.freight === "" ? 0 : round2(toNumber(body.freight));
  if (!Number.isFinite(freight) || freight < 0 || freight > MAX_FREIGHT) {
    return { error: "Frete inválido." };
  }

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return { error: "Adicione pelo menos um produto." };
  }
  if (body.lines.length > MAX_ENTRY_LINES) return { error: "A entrada tem itens demais." };

  const seen = new Set<string>();
  const lines: EntryLineInput[] = [];
  for (const rawLine of body.lines) {
    const line = (rawLine ?? {}) as Record<string, unknown>;
    const productId = typeof line.productId === "string" ? line.productId.trim() : "";
    const variantId = typeof line.variantId === "string" && line.variantId.trim() ? line.variantId.trim() : null;
    const qty = toNumber(line.qty);
    const unitCost = round2(toNumber(line.unitCost));

    if (!productId) return { error: "Há um item sem produto." };
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_LINE_QTY) {
      return { error: `Quantidade inválida (de 1 a ${MAX_LINE_QTY}).` };
    }
    if (!Number.isFinite(unitCost) || unitCost <= 0 || unitCost > MAX_UNIT_COST) {
      return { error: "Informe o custo unitário de todos os itens (maior que zero)." };
    }

    const key = `${productId}:${variantId ?? "base"}`;
    if (seen.has(key)) return { error: "Há um item repetido na entrada." };
    seen.add(key);

    lines.push({ productId, variantId, qty, unitCost });
  }

  return { value: { idempotencyKey, entryDate, origin, supplier, freight, notes, lines } };
}

// Divide o frete entre as linhas proporcionalmente ao valor de cada uma, em
// centavos, de modo que a soma dê exatamente o frete (maior resto primeiro).
export function allocateFreight(lines: { qty: number; unitCost: number }[], freight: number): number[] {
  const totalCents = Math.round(freight * 100);
  if (lines.length === 0 || totalCents <= 0) return lines.map(() => 0);

  const weights = lines.map((line) => Math.round(line.qty * line.unitCost * 100));
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  const basis = weightSum > 0 ? weights : lines.map((line) => line.qty);
  const basisSum = basis.reduce((sum, value) => sum + value, 0);

  const exact = basis.map((weight) => (totalCents * weight) / basisSum);
  const shares = exact.map(Math.floor);
  let remainder = totalCents - shares.reduce((sum, value) => sum + value, 0);

  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (remainder <= 0) break;
    shares[index] += 1;
    remainder -= 1;
  }

  return shares.map((cents) => cents / 100);
}

// Custo unitário já com a parte do frete.
export function landedUnitCost(line: { qty: number; unitCost: number }, freightShare: number) {
  return round2((line.qty * line.unitCost + freightShare) / line.qty);
}

// Novo custo do produto depois da entrada (média ponderada).
export function weightedAverageCost(input: {
  stockBefore: number;
  costBefore: number | null;
  qty: number;
  landedUnitCost: number;
}) {
  const stock = Math.max(0, input.stockBefore);
  if (input.costBefore === null || stock === 0) return round2(input.landedUnitCost);
  return round2((stock * input.costBefore + input.qty * input.landedUnitCost) / (stock + input.qty));
}

// Avisa quando o custo digitado está muito longe do custo atual do produto
// (o erro mais comum é errar a vírgula: 150 em vez de 15,00). Não bloqueia.
export function costDeviation(costBefore: number | null, landedCost: number): "alto" | "baixo" | null {
  if (costBefore === null || costBefore <= 0 || landedCost <= 0) return null;
  if (landedCost >= costBefore * 2) return "alto";
  if (landedCost <= costBefore / 2) return "baixo";
  return null;
}

export type EntryTotals = { items: number; units: number; subtotal: number; freight: number; total: number };

export function entryTotals(lines: { qty: number; unitCost: number }[], freight: number): EntryTotals {
  const subtotal = round2(lines.reduce((sum, line) => sum + line.qty * line.unitCost, 0));
  return {
    items: lines.length,
    units: lines.reduce((sum, line) => sum + line.qty, 0),
    subtotal,
    freight: round2(freight),
    total: round2(subtotal + freight),
  };
}

// ---- Estorno ----

// Só dá para estornar se o estoque atual ainda comporta o que entrou; senão
// parte da mercadoria já foi vendida e o estoque ficaria negativo.
export function canReverseLine(currentStock: number, qty: number) {
  return currentStock >= qty;
}

// O custo anterior só volta se ninguém mexeu no custo depois desta entrada.
export function costAfterReversal(input: {
  currentCost: number | null;
  costAfter: number | null;
  costBefore: number | null;
}): { restore: boolean; cost: number | null } {
  const unchanged =
    input.currentCost !== null && input.costAfter !== null && Math.abs(input.currentCost - input.costAfter) < 0.005;
  return unchanged ? { restore: true, cost: input.costBefore } : { restore: false, cost: input.currentCost };
}
