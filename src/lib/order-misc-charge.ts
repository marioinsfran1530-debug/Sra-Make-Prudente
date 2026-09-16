export type OrderMiscChargeInput = {
  description?: string;
  amount?: number;
};

export function normalizeOrderMiscCharge(input: OrderMiscChargeInput) {
  const amount = Math.round((Number(input.amount ?? 0) + Number.EPSILON) * 100) / 100;

  if (!Number.isFinite(amount) || amount < 0 || amount > 99999.99) {
    throw new Error("Valor de diversos inválido.");
  }

  const description = String(input.description ?? "").trim().slice(0, 120) || "Diversos";
  return { description, amount };
}
