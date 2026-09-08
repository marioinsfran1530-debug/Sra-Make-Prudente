import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { whatsappUrl } from "@/lib/crm";
import { formatCrmDateTime } from "@/lib/crm-time";

export const dynamic = "force-dynamic";

const CHECKOUT_SOURCE = "catalogo_checkout";

function pct(part: number, total: number) {
  const value = total > 0 ? (part / total) * 100 : 0;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function money(value: unknown) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

type Row = {
  id: string;
  name: string;
  brand: string;
  description: string | null;
  stockQty: number;
  views: number;
  carts: number;
  finalized: number;
};

function priority(row: Row) {
  if (row.carts > 0 && row.finalized === 0) return 100 + row.carts * 10 + row.views;
  if (row.views >= 5 && row.finalized === 0) return 50 + row.views;
  if (!row.description || row.description.trim().length < 50) return 20;
  return 0;
}

function action(row: Row) {
  if (row.stockQty <= 0) return "Revisar estoque antes de promover";
  if (row.carts > 0 && row.finalized === 0) return "Revisar preço, oferta e fechamento";
  if (row.views >= 5 && row.carts === 0) return "Revisar foto, título, descrição e preço";
  if (!row.description || row.description.trim().length < 50) return "Melhorar descrição para SEO e conversão";
  return "Continuar coletando dados";
}

function checkoutItemsSummary(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "Carrinho salvo";
  }

  const snapshot = (metadata as Record<string, unknown>).cartSnapshot;
  if (!Array.isArray(snapshot) || snapshot.length === 0) return "Carrinho salvo";

  const names = snapshot
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const name = typeof row.productName === "string" ? row.productName.trim() : "";
      const variant = typeof row.variantName === "string" ? row.variantName.trim() : "";
      return name ? `${name}${variant ? ` (${variant})` : ""}` : null;
    })
    .filter((item): item is string => Boolean(item));

  if (names.length === 0) return "Carrinho salvo";
  const visible = names.slice(0, 2).join(" · ");
  return names.length > 2 ? `${visible} · +${names.length - 2} itens` : visible;
}

export default async function OportunidadesPage() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [behavior, finalizedOrders, checkoutRecoveries] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["productId", "event"],
      where: {
        createdAt: { gte: since },
        productId: { not: null },
        event: { in: ["product_view", "add_to_cart"] },
      },
      _count: { _all: true },
    }),
    prisma.order.findMany({
      where: { status: "FINALIZADO", updatedAt: { gte: since } },
      select: { items: { select: { productId: true } } },
    }),
    prisma.crmLead.findMany({
      where: {
        source: CHECKOUT_SOURCE,
        stage: "NOVO",
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        interactions: {
          where: { kind: "CHECKOUT_CATALOGO" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { metadata: true, createdAt: true },
        },
      },
    }),
  ]);

  const stats = new Map<string, { views: number; carts: number; finalized: number }>();
  const ensure = (id: string) => {
    const current = stats.get(id);
    if (current) return current;
    const fresh = { views: 0, carts: 0, finalized: 0 };
    stats.set(id, fresh);
    return fresh;
  };

  for (const item of behavior) {
    if (!item.productId) continue;
    const current = ensure(item.productId);
    if (item.event === "product_view") current.views = item._count._all;
    if (item.event === "add_to_cart") current.carts = item._count._all;
  }

  for (const order of finalizedOrders) {
    const ids = new Set(order.items.map((item) => item.productId));
    for (const id of ids) ensure(id).finalized += 1;
  }

  const products = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, name: true, brand: true, description: true, stockQty: true },
  });

  const rows: Row[] = products
    .map((product) => ({ ...product, ...(stats.get(product.id) ?? { views: 0, carts: 0, finalized: 0 }) }))
    .filter((row) => row.carts > 0 || row.views >= 5 || !row.description || row.description.trim().length < 50)
    .sort((a, b) => priority(b) - priority(a))
    .slice(0, 50);

  const highIntent = rows.filter((row) => row.carts > 0 && row.finalized === 0).length;
  const seenNoCart = rows.filter((row) => row.views >= 5 && row.carts === 0).length;
  const weakDescription = rows.filter((row) => !row.description || row.description.trim().length < 50).length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Próximas ações</p>
          <h1 className="font-serif text-2xl font-bold text-texto">Oportunidades dos produtos</h1>
          <p className="mt-1 max-w-3xl text-sm text-cinza">Prioriza os produtos que merecem intervenção com base nos últimos 30 dias de comportamento real e também destaca checkouts que precisam de contato comercial.</p>
        </div>
        <Link href="/admin/analise/produtos" className="rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo">Ver desempenho completo</Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Checkouts para recuperar" value={checkoutRecoveries.length} attention={checkoutRecoveries.length > 0} />
        <Metric label="Intenção sem venda" value={highIntent} />
        <Metric label="Vistos sem carrinho" value={seenNoCart} />
        <Metric label="Descrição fraca" value={weakDescription} />
      </div>

      {checkoutRecoveries.length > 0 && (
        <section className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-amber-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-amber-950">Recuperar vendas do checkout</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-800">A cliente tocou em Registrar pedido, mas a venda não foi criada. O contato e o carrinho ficaram salvos.</p>
            </div>
            <Link href="/admin/crm/oportunidades" className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-center text-xs font-extrabold text-amber-900">Ver no CRM</Link>
          </div>
          <div className="divide-y divide-amber-200">
            {checkoutRecoveries.slice(0, 5).map((lead) => {
              const interaction = lead.interactions[0];
              const message = `Olá, ${lead.customer.name.split(" ")[0]}! Aqui é da Sra Make Prudente. Vimos que seu pedido no catálogo não conseguiu ser concluído. Posso te ajudar a finalizar?`;
              return (
                <div key={lead.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="font-extrabold text-amber-950">{lead.customer.name}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-amber-900">
                      {money(lead.estimatedValue)} · {checkoutItemsSummary(interaction?.metadata)} · {formatCrmDateTime(interaction?.createdAt ?? lead.updatedAt)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <a href={whatsappUrl(lead.customer.phone, message)} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-emerald-600 px-4 py-3 text-center text-[11px] font-extrabold text-white">WhatsApp</a>
                    <Link href={`/admin/crm/${encodeURIComponent(lead.customer.phone)}`} className="rounded-xl border border-amber-300 bg-white px-4 py-3 text-center text-[11px] font-extrabold text-amber-900">Ver cliente</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-rosa/10 px-5 py-4">
          <h2 className="font-bold text-texto">Fila de prioridade dos produtos</h2>
          <p className="mt-1 text-[11px] text-cinza">A ordem privilegia intenção sem venda, depois produtos vistos sem carrinho e, por fim, cadastros fracos.</p>
        </div>

        {rows.length === 0 ? (
          <p className="p-6 text-sm text-cinza">Ainda não há oportunidades com amostra suficiente.</p>
        ) : (
          <div className="divide-y divide-rosa/10">
            {rows.map((row, index) => (
              <div key={row.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[48px_1fr_360px_110px] lg:items-center">
                <div className="text-lg font-extrabold text-rosa-profundo">#{index + 1}</div>
                <div>
                  <p className="font-bold text-texto">{row.name}</p>
                  <p className="mt-0.5 text-[11px] text-cinza">{row.brand} · estoque {row.stockQty} · {row.views} vistas · {row.carts} carrinhos · {row.finalized} vendas</p>
                  <p className="mt-1 text-[11px] font-semibold text-rosa-profundo">Intenção: {pct(row.carts, row.views)}</p>
                </div>
                <div className="rounded-xl bg-creme/60 px-3 py-2 text-xs font-semibold text-texto">{action(row)}</div>
                <Link href={`/admin/produtos/${row.id}`} className="rounded-xl border border-rosa/20 bg-white px-3 py-2 text-center text-xs font-bold text-rosa-profundo hover:bg-creme">Editar produto</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-5 text-[11px] leading-5 text-cinza">Os sinais são apoio à decisão, não conclusões automáticas. Nos primeiros dias, a amostra de comportamento ainda é pequena; use a fila para priorizar revisão, não para alterar preço ou estoque sem conferência comercial.</p>
    </div>
  );
}

function Metric({ label, value, attention = false }: { label: string; value: number; attention?: boolean }) {
  return <div className={`rounded-2xl border p-4 shadow-sm ${attention ? "border-amber-200 bg-amber-50" : "border-transparent bg-white"}`}><p className="text-2xl font-extrabold text-texto">{value.toLocaleString("pt-BR")}</p><p className="mt-1 text-[11px] text-cinza">{label}</p></div>;
}
