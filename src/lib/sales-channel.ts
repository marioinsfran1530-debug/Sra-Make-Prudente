// Canal de origem das vendas.
//
// O campo `Order.channel` (enum) continua com a regra operacional original
// (CATALOGO, WHATSAPP, LOJA_FISICA, MANUAL) e é usado para decidir fluxos como
// "converter pedido em venda". Vendas lançadas no balcão (inclusive as
// entregas combinadas por WhatsApp/Facebook) ficam como LOJA_FISICA.
//
// O canal real de aquisição dessas vendas é gravado em `Order.origin`, que é
// texto livre. Não usamos novos valores do enum para não quebrar versões do
// código que ainda não os conhecem.

export const COUNTER_SALE_CHANNELS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "presencial", label: "Presencial (na loja)" },
  { value: "outro", label: "Outro" },
] as const;

export type CounterSaleChannel = (typeof COUNTER_SALE_CHANNELS)[number]["value"];

export const DEFAULT_COUNTER_SALE_CHANNEL: CounterSaleChannel = "whatsapp";

export function normalizeCounterSaleChannel(value: unknown): CounterSaleChannel {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  const found = COUNTER_SALE_CHANNELS.find((item) => item.value === raw);
  return found ? found.value : DEFAULT_COUNTER_SALE_CHANNEL;
}

const ORDER_CHANNEL_LABEL: Record<string, string> = {
  CATALOGO: "Catálogo",
  WHATSAPP: "WhatsApp",
  LOJA_FISICA: "Balcão (canal não informado)",
  MANUAL: "Manual",
};

// Rótulo exibido para o canal de uma venda, combinando o enum do pedido com a
// origem gravada no lançamento de balcão.
export function salesChannelLabel(channel: string, origin?: string | null) {
  if (channel === "LOJA_FISICA") {
    const raw = String(origin ?? "").trim().toLowerCase();
    const found = COUNTER_SALE_CHANNELS.find((item) => item.value === raw);
    if (found) return found.label;
  }
  return ORDER_CHANNEL_LABEL[channel] ?? channel;
}
