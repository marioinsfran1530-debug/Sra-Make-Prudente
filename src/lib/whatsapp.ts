export const WHATSAPP_NUMBER = "5518991248713";

export function waLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export type OrderMessageItem = {
  name: string;
  variantName: string | null;
  qty: number;
  subtotal: number;
};

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PAYMENT_LABEL: Record<string, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão",
  CONFIRMAR_WHATSAPP: "Confirmar pelo WhatsApp",
};

// Monta a mensagem final do pedido (plano, seção 24/seção 7 do master v3).
// Nunca declara pagamento como concluído — o WhatsApp é sempre confirmação humana.
export function buildOrderMessage(params: {
  orderNumber: number;
  customerName: string;
  items: OrderMessageItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryType: "RETIRADA" | "ENTREGA";
  address?: string | null;
  payment: string;
  notes?: string | null;
}) {
  const lines = params.items.map(
    (i) => `- ${i.name}${i.variantName ? ` (${i.variantName})` : ""} — ${i.qty}x — ${money(i.subtotal)}`
  );

  const parts = [
    "Olá! Quero fazer um pedido na Sra Make Prudente.",
    "",
    `Pedido: #${params.orderNumber}`,
    `Nome: ${params.customerName}`,
    "",
    "Produtos:",
    ...lines,
    "",
    `Subtotal: ${money(params.subtotal)}`,
    params.deliveryFee > 0 ? `Entrega: ${money(params.deliveryFee)}` : null,
    `Total: ${money(params.total)}`,
    "",
    `Recebimento: ${params.deliveryType === "RETIRADA" ? "Retirar na loja" : "Entrega"}`,
    params.deliveryType === "ENTREGA" && params.address ? `Endereço: ${params.address}` : null,
    `Pagamento: ${PAYMENT_LABEL[params.payment] ?? params.payment}`,
    params.notes ? `Observação: ${params.notes}` : null,
    "",
    "Vim pelo catálogo da Sra Make Prudente.",
  ];

  return parts.filter((l) => l !== null).join("\n");
}
