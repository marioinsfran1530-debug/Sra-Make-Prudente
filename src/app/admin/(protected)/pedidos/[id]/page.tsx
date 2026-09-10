import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { waLink } from "@/lib/whatsapp";
import { OrderStatusControl } from "@/components/admin/OrderStatusControl";

const GOOGLE_REVIEW_URL = "https://g.page/r/Cd60IkMVKKNtEBI/review";

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

  const productIds = [...new Set(order.items.map((item) => item.productId))];
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          brand: true,
          sku: true,
          images: {
            orderBy: { order: "asc" },
            take: 1,
            select: { url: true, alt: true },
          },
        },
      })
    : [];
  const productById = new Map(products.map((product) => [product.id, product]));

  const hasPhone = Boolean(order.customerPhone.trim());
  const canTakeToSale =
    order.channel !== "LOJA_FISICA" && order.status !== "FINALIZADO" && order.status !== "CANCELADO";
  const reviewMessage = `Maravilhosa, obrigada por escolher a Sra Make. 💗\n\nSe você saiu satisfeita, deixe sua experiência registrada e ajude outra pessoa a escolher com mais confiança:\n${GOOGLE_REVIEW_URL}`;

  return (
    <div className="max-w-lg">
      <Link href="/admin/pedidos" className="mb-3 inline-flex text-[11px] font-bold text-rosa-profundo hover:underline">← Voltar para pedidos</Link>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-texto">Pedido #{order.number}</h1>
          <p className="text-xs text-cinza">{new Date(order.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${order.channel === "LOJA_FISICA" ? "bg-green-50 text-green-700" : "bg-creme text-rosa-profundo"}`}>{CHANNEL_LABEL[order.channel] ?? order.channel}</span>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {canTakeToSale && (
            <Link
              href={`/admin/vendas/nova?pedido=${order.id}`}
              className="rounded-xl bg-rosa-profundo px-3 py-2 text-center text-xs font-bold text-white"
            >
              Levar para Nova venda
            </Link>
          )}
          {order.channel === "LOJA_FISICA" && (
            <Link href="/admin/vendas/nova" className="rounded-xl border border-rosa/20 px-3 py-2 text-center text-xs font-bold text-rosa-profundo">+ Nova venda</Link>
          )}
        </div>
      </div>

      {canTakeToSale && (
        <div className="mb-4 rounded-xl border border-rosa/15 bg-creme/60 px-3 py-2.5 text-[11px] leading-5 text-cinza">
          Use <strong className="text-texto">Levar para Nova venda</strong> quando o cliente acrescentar itens pelo WhatsApp. O pedido original permanece salvo e a venda abre pronta para revisão e pagamento.
        </div>
      )}

      <div className="mb-4 rounded-2xl bg-white p-4" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}>
        <p className="text-sm font-bold text-texto">{order.customerName}</p>
        {hasPhone ? <p className="mb-2 text-xs text-cinza">{order.customerPhone}</p> : <p className="mb-2 text-xs text-cinza">Sem telefone informado</p>}
        {hasPhone && (
          <div className="flex flex-wrap gap-2">
            <a href={waLink(`Oi ${order.customerName}! Atualização do seu pedido #${order.number} na Sra Make Prudente:\n\nStatus atual: ${STATUS_LABEL[order.status] ?? order.status}\n\nQualquer dúvida, estamos à disposição.`, order.customerPhone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white" style={{ backgroundColor: "#25D366" }}><MessageCircle size={13} /> Abrir WhatsApp</a>
            {order.status === "FINALIZADO" && (
              <a href={waLink(reviewMessage, order.customerPhone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800"><Star size={13} /> Pedir avaliação no Google</a>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4" style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}>
        <p className="mb-1 text-xs font-bold text-texto">Produtos</p>
        <p className="mb-2 text-[10px] text-cinza">Identificação visual para separar o pedido com mais segurança.</p>

        <div className="divide-y divide-rosa/10">
          {order.items.map((item) => {
            const product = productById.get(item.productId);
            const image = product?.images[0];
            const brand = item.brand?.trim() || product?.brand?.trim();
            const sku = item.sku?.trim() || product?.sku?.trim();

            return (
              <div key={item.id} className="flex gap-3 py-3 first:pt-1">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-rosa/10 bg-creme">
                  {image ? (
                    <Image
                      src={image.url}
                      alt={image.alt || item.name}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] font-semibold text-cinza">
                      Sem foto
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 font-bold leading-snug text-texto">{item.name}</p>
                    <span className="shrink-0 text-sm font-bold text-rosa-profundo">{money(Number(item.subtotal))}</span>
                  </div>

                  {brand && <p className="mt-0.5 text-[11px] font-semibold text-cinza">{brand}</p>}
                  {item.variantName && (
                    <p className="mt-1 text-xs font-bold text-texto">Opção: {item.variantName}</p>
                  )}

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-cinza">
                    <span>{item.qty} un. × {money(Number(item.unitPrice))}</span>
                    {sku && <span>SKU: {sku}</span>}
                  </div>

                  {product && (
                    <Link
                      href={`/produto/${item.productId}`}
                      target="_blank"
                      className="mt-1 inline-flex text-[10px] font-bold text-rosa-profundo hover:underline"
                    >
                      Ver produto →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {order.notes && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-800">
              Atenção · observação da cliente
            </p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-amber-950">{order.notes}</p>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-1 border-t border-rosa/10 pt-3 text-sm">
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
