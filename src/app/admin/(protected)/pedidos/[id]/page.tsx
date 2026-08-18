import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { waLink } from "@/lib/whatsapp";
import { OrderStatusControl } from "@/components/admin/OrderStatusControl";

const STATUS_LABEL: Record<string, string> = {
  NOVO: "Novo",
  EM_CONFIRMACAO: "Em confirmação",
  CONFIRMADO: "Confirmado",
  SEPARANDO: "Separando",
  PRONTO_RETIRADA: "Pronto para retirada",
  SAIU_ENTREGA: "Saiu para entrega",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export default async function AdminPedidoDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!order) notFound();

  return (
    <div className="max-w-lg">
      <h1 className="font-serif font-bold text-xl text-texto mb-1">Pedido #{order.number}</h1>
      <p className="text-xs text-cinza mb-4">
        {new Date(order.createdAt).toLocaleString("pt-BR")}
      </p>

      <div className="bg-white rounded-2xl p-4 mb-4" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}>
        <p className="text-sm font-bold text-texto">{order.customerName}</p>
        <p className="text-xs text-cinza mb-2">{order.customerPhone}</p>
        <a
          href={waLink(
            `Oi ${order.customerName}! Atualização do seu pedido #${order.number} na Sra Make Prudente:\n\nStatus atual: ${STATUS_LABEL[order.status] ?? order.status}\n\nQualquer dúvida, estamos à disposição.`,
            order.customerPhone
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full text-white"
          style={{ backgroundColor: "#25D366" }}
        >
          <MessageCircle size={13} /> Abrir WhatsApp
        </a>
      </div>

      <div className="bg-white rounded-2xl p-4 mb-4" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}>
        <p className="text-xs font-bold text-texto mb-2">Produtos</p>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm mb-1">
            <span className="text-texto">
              {item.name}
              {item.variantName ? ` (${item.variantName})` : ""} × {item.qty}
            </span>
            <span className="font-bold text-rosa-profundo">{money(Number(item.subtotal))}</span>
          </div>
        ))}
        <div className="border-t border-rosa/10 mt-2 pt-2 flex flex-col gap-1 text-sm">
          <Row label="Subtotal" value={money(Number(order.subtotal))} />
          {Number(order.deliveryFee) > 0 && (
            <Row label="Entrega" value={money(Number(order.deliveryFee))} />
          )}
          <Row label="Total" value={money(Number(order.total))} bold />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 mb-4" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}>
        <Row label="Recebimento" value={order.deliveryType === "RETIRADA" ? "Retirar na loja" : "Entrega"} />
        {order.address && <Row label="Endereço" value={order.address} />}
        <Row label="Pagamento" value={order.payment} />
        {order.notes && <Row label="Observação" value={order.notes} />}
        {order.utmSource && <Row label="Origem (UTM)" value={order.utmSource} />}
      </div>

      <div className="bg-white rounded-2xl p-4" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}>
        <OrderStatusControl
          orderId={order.id}
          status={order.status}
        />
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-cinza">{label}</span>
      <span className={bold ? "font-extrabold" : "font-medium"} style={{ color: bold ? "#A6157A" : "#23142A" }}>
        {value}
      </span>
    </div>
  );
}
