export function normalizeBrazilPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;

  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }

  if (digits.length !== 10 && digits.length !== 11) return null;
  if (/^(\d)\1+$/.test(digits)) return null;

  return `+55${digits}`;
}

export type ComparableOrderItem = {
  productId: string;
  variantId: string | null;
  qty: number;
};

export function orderItemsFingerprint(items: ComparableOrderItem[]): string {
  return items
    .map((item) => ({
      productId: item.productId,
      variantId: item.variantId ?? "",
      qty: item.qty,
    }))
    .sort((a, b) => {
      const left = `${a.productId}:${a.variantId}`;
      const right = `${b.productId}:${b.variantId}`;
      return left.localeCompare(right);
    })
    .map((item) => `${item.productId}:${item.variantId}:${item.qty}`)
    .join("|");
}

export function sameOrderItems(
  first: ComparableOrderItem[],
  second: ComparableOrderItem[]
): boolean {
  return orderItemsFingerprint(first) === orderItemsFingerprint(second);
}

export function buildOrderRequestKey(input: {
  customerPhone: string;
  sessionId?: string | null;
  deliveryType: string;
  payment: string;
  address?: string | null;
  items: ComparableOrderItem[];
}): string {
  return [
    input.customerPhone,
    input.sessionId ?? "",
    input.deliveryType,
    input.payment,
    input.address ?? "",
    orderItemsFingerprint(input.items),
  ].join("||");
}
