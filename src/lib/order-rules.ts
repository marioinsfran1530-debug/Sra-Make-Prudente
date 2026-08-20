export const VALID_ORDER_STATUSES = [
  "NOVO",
  "EM_CONFIRMACAO",
  "CONFIRMADO",
  "SEPARANDO",
  "PRONTO_RETIRADA",
  "SAIU_ENTREGA",
  "FINALIZADO",
  "CANCELADO",
] as const;

export type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

export const STOCK_DECREMENTED_STATUSES: OrderStatus[] = [
  "CONFIRMADO",
  "SEPARANDO",
  "PRONTO_RETIRADA",
  "SAIU_ENTREGA",
  "FINALIZADO",
];

export function isValidOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && VALID_ORDER_STATUSES.includes(value as OrderStatus);
}

export function isClosedOrderStatus(status: string): boolean {
  return status === "FINALIZADO" || status === "CANCELADO";
}

export function stockWasDecremented(status: string): boolean {
  return STOCK_DECREMENTED_STATUSES.includes(status as OrderStatus);
}

export function getAllowedOrderTransitions(status: string): OrderStatus[] {
  switch (status) {
    case "NOVO":
      return ["CONFIRMADO", "CANCELADO"];
    case "EM_CONFIRMACAO":
      return ["CONFIRMADO", "CANCELADO"];
    case "CONFIRMADO":
      return ["FINALIZADO", "CANCELADO"];
    case "SEPARANDO":
    case "PRONTO_RETIRADA":
    case "SAIU_ENTREGA":
      return ["FINALIZADO", "CANCELADO"];
    case "FINALIZADO":
    case "CANCELADO":
    default:
      return [];
  }
}

export function canTransitionOrder(from: string, to: string): boolean {
  if (!isValidOrderStatus(to)) return false;
  if (from === to) return false;
  return getAllowedOrderTransitions(from).includes(to);
}
