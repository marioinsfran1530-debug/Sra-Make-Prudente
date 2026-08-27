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

const CHANNEL_LABEL: Record<string, string> = {
  CATALOGO: "Catálogo",
  WHATSAPP: "WhatsApp",
  LOJA_FISICA: "Loja física",
  MANUAL: "Manual",
};

const PAYMENT_LABEL: Record<string, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  CONFIRMAR_WHATSAPP: "Confirmar no WhatsApp",
};

export default async function AdminPedidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!order) notFound();
  const hasPhone = Boolean(order.customerPhone.trim());

  return (
    <div className="max-w-lg">
      <Link href="/admin/pedidos" className="mb-3 inline-flex text-[11px] font-bold text-rosa-profundo hover:underline">← Voltar para pedidos</Link>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-texto">Pedido #{order.number}</h1>
          <p className="text-xs text-cinza">{new Date(order.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${order.channel === "LOJA_FISICA" ? "bg-green-50 text-green-700" : "bg-creme text-rosa-profundo"}`}>{CHANNEL_LABEL[order.channel] ?? order.channel}</span>
        </div>
        {order.channel === "LOJA_FISICA" && (
          <Link href="/admin/vendas/nova" className="rounded-xl border border-rosa/20 px-3 py-2 text-xs font-bold text-rosa-profundo">+ Nova venda</Link>
        )}
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}>
        <p className="text-sm font-bold text-texto">{order.customerName}</p>
        {hasPhone ? <p className="mb-2 text-xs text-cinza">{order.customerPhone}</p> : <p className="mb-2 text-xs text-cinza">Sem telefone informado</p>}
        {hasPhone && (
          <a href={waLink(`Oi ${order.customerName}! Atualização do seu pedido #${order.number} na Sra Make Prudente:\n\nStatus atual: ${STATUS_LABEL[order.status] ?? order.status}\n\nQualquer dúvida, estamos à disposição.`, order.customerPhone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white" style={{ backgroundColor: "#25D366" }}><MessageCircle size={13} /> Abrir WhatsApp</a>
        )}
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}>
        <p className="mb-2 text-xs font-bold text-texto">Produtos</p>
        {order.items.map((item) => (
          <div key={item.id} className="mb-1 flex justify-between gap-3 text-sm">
            <span className="min-w-0 text-texto">{item.name}{item.variantName ? ` (${item.variantName})` : ""} × {item.qty}</span>
            <span className="shrink-0 font-bold text-rosa-profundo">{money(Number(item.subtotal))}</span>
          </div>
        ))}
        <div className="mt-2 flex flex-col gap-1 border-t border-rosa/10 pt-2 text-sm">
          <Row label="Subtotal" value={money(Number(order.subtotal))} />
          {Number(order.discount) > 0 && <Row label="Desconto" value={`- ${money(Number(order.discount))}`} />}
          {Number(order.deliveryFee) > 0 && <Row label="Entrega" value={money(Number(order.deliveryFee))} />}
          <Row label="Total" value={money(Number(order.total))} bold />
        </div>
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}>
        <Row label="Canal" value={CHANNEL_LABEL[order.channel] ?? order.channel} />
        <Row label="Recebimento" value={order.deliveryType === "RETIRADA" ? "Retirada / balcão" : "Entrega"} />
        {order.address && <Row label="Endereço" value={order.address} />}
        {order.payments.length > 0 ? order.payments.map((payment) => (
          <Row key={payment.id} label="Pagamento" value={`${PAYMENT_LABEL[payment.method] ?? payment.method} · ${money(Number(payment.amount))}`} />
        )) : <Row label="Pagamento" value={PAYMENT_LABEL[order.payment] ?? order.payment} />}
        {order.createdBy && <Row label="Registrado por" value={order.createdBy.name || order.createdBy.email} />}
        {order.notes && <Row label="Observação" value={order.notes} />}
        {order.utmSource && <Row label="Origem (UTM)" value={order.utmSource} />}
      </div>

      <div className="rounded-2xl bg-white p-4" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}>
        <OrderStatusControl orderId={order.id} status={order.status} deliveryType={order.deliveryType} />
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-cinza">{label}</span>
      <span className={`min-w-0 text-right ${bold ? "font-extrabold" : "font-medium"}`} style={{ color: bold ? "#A6157A" : "#23142A" }}>{value}</span>
    </div>
  );
}
