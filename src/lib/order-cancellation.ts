export const ORDER_CANCEL_REASONS = [
  { value: "CUSTOMER_WITHDREW", label: "Cliente desistiu" },
  { value: "WRONG_PRODUCT", label: "Produto lançado errado" },
  { value: "WRONG_QUANTITY", label: "Quantidade errada" },
  { value: "WRONG_PRICE_DISCOUNT", label: "Preço ou desconto errado" },
  { value: "WRONG_PAYMENT_METHOD", label: "Forma de pagamento errada" },
  { value: "DUPLICATE_SALE", label: "Venda duplicada" },
  { value: "OTHER", label: "Outro" },
] as const;

export type OrderCancelReasonCode = (typeof ORDER_CANCEL_REASONS)[number]["value"];

export const REFUND_STATUSES = ["PENDING", "REFUNDED", "NOT_REQUIRED"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export function isOrderCancelReasonCode(value: unknown): value is OrderCancelReasonCode {
  return typeof value === "string" && ORDER_CANCEL_REASONS.some((item) => item.value === value);
}

export function cancelReasonLabel(value: string | null | undefined) {
  return ORDER_CANCEL_REASONS.find((item) => item.value === value)?.label ?? "Motivo não informado";
}

export function isRefundStatus(value: unknown): value is RefundStatus {
  return typeof value === "string" && REFUND_STATUSES.includes(value as RefundStatus);
}

export function refundStatusLabel(value: string | null | undefined) {
  if (value === "PENDING") return "Estorno/devolução pendente";
  if (value === "REFUNDED") return "Estornado/devolvido";
  if (value === "NOT_REQUIRED") return "Sem estorno necessário";
  return "Não informado";
}
