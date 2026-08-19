export const WHATSAPP_NUMBER = "5518991248713";

export function waLink(message: string, number = WHATSAPP_NUMBER) {
  const normalizedNumber = number.replace(/\D/g, "");

  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}

export type OrderMessageItem = {
  name: string;
  variantName: string | null;
  qty: number;
  subtotal: number;
};

const money = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PAYMENT_LABEL: Record<string, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão",
  CONFIRMAR_WHATSAPP: "Confirmar pelo WhatsApp",
};

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return value.trim();
}

// Monta uma mensagem curta e operacional para facilitar o atendimento no WhatsApp.
// Nunca declara pagamento como concluído — o WhatsApp continua sendo confirmação humana.
export function buildOrderMessage(params: {
  orderNumber: number;
  customerName: string;
  customerPhone: string;
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
    (i) =>
      `• ${i.qty}x ${i.name}${i.variantName ? ` (${i.variantName})` : ""} — ${money(i.subtotal)}`
  );

  const parts = [
    "Olá! Quero finalizar meu pedido na *Sra Make Prudente*.",
    "",
    `*PEDIDO #${params.orderNumber}*`,
    "",
    `*Cliente:* ${params.customerName}`,
    `*WhatsApp:* ${formatPhone(params.customerPhone)}`,
    "",
    "*PRODUTOS*",
    ...lines,
    "",
    "*RESUMO*",
    `Subtotal: ${money(params.subtotal)}`,
    params.deliveryFee > 0 ? `Entrega: ${money(params.deliveryFee)}` : null,
    `*Total: ${money(params.total)}*`,
    "",
    `*${params.deliveryType === "RETIRADA" ? "RETIRADA" : "ENTREGA"}*`,
    params.deliveryType === "RETIRADA" ? "Tipo: Retirar na loja" : "Tipo: Entrega",
    params.deliveryType === "ENTREGA" && params.address
      ? `Endereço: ${params.address}`
      : null,
    "",
    "*PAGAMENTO*",
    PAYMENT_LABEL[params.payment] ?? params.payment,
    params.notes ? "" : null,
    params.notes ? "*OBSERVAÇÃO*" : null,
    params.notes ? params.notes : null,
    "",
    "Pedido realizado pelo Catálogo Sra Make Prudente.",
    "Aguardo a confirmação do pedido.",
  ];

  return parts.filter((line) => line !== null).join("\n");
}
