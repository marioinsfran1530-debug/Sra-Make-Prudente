import Link from "next/link";
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

export default async function AdminPedidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) notFound();

  return (
    <div className="max-w-lg">
      <Link
        href="/admin/pedidos"
        className="mb-3 inline-flex text-[11px] font-bold text-rosa-profundo hover:underline"
      >
        ← Voltar para pedidos
      </Link>

      <h1 className="font-serif text-xl font-bold text-texto">Pedido #{order.number}</h1>
      <p className="mb-4 text-xs text-cinza">
        {new Date(order.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
      </p>

      <div className="mb-4 rounded-2xl bg-white p-4" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}>
        <p className="text-sm font-bold text-texto">{order.customerName}</p>
        <p className="mb-2 text-xs text-cinza">{order.customerPhone}</p>
        <a
          href={waLink(
            `Oi ${order.customerName}! Atualização do seu pedido #${order.number} na Sra Make Prudente:\n\nStatus atual: ${STATUS_LABEL[order.status] ?? order.status}\n\nQualquer dúvida, estamos à disposição.`,
            order.customerPhone
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white"
          style={{ backgroundColor: "#25D366" }}
        >
          <MessageCircle size={13} /> Abrir WhatsApp
        </a>
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}>
        <p className="mb-2 text-xs font-bold text-texto">Produtos</p>
        {order.items.map((item) => (
          <div key={item.id} className="mb-1 flex justify-between gap-3 text-sm">
            <span className="min-w-0 text-texto">
              {item.name}{item.variantName ? ` (${item.variantName})` : ""} × {item.qty}
            </span>
            <span className="shrink-0 font-bold text-rosa-profundo">{money(Number(item.subtotal))}</span>
          </div>
        ))}
        <div className="mt-2 flex flex-col gap-1 border-t border-rosa/10 pt-2 text-sm">
          <Row label="Subtotal" value={money(Number(order.subtotal))} />
          {Number(order.deliveryFee) > 0 && <Row label="Entrega" value={money(Number(order.deliveryFee))} />}
          <Row label="Total" value={money(Number(order.total))} bold />
        </div>
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}>
        <Row label="Recebimento" value={order.deliveryType === "RETIRADA" ? "Retirar na loja" : "Entrega"} />
        {order.address && <Row label="Endereço" value={order.address} />}
        <Row label="Pagamento" value={order.payment} />
        {order.notes && <Row label="Observação" value={order.notes} />}
        {order.utmSource && <Row label="Origem (UTM)" value={order.utmSource} />}
      </div>

      <div className="rounded-2xl bg-white p-4" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}>
        <OrderStatusControl
          orderId={order.id}
          status={order.status}
          deliveryType={order.deliveryType}
        />
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-cinza">{label}</span>
      <span
        className={`min-w-0 text-right ${bold ? "font-extrabold" : "font-medium"}`}
        style={{ color: bold ? "#A6157A" : "#23142A" }}
      >
        {value}
      </span>
    </div>
  );
}
