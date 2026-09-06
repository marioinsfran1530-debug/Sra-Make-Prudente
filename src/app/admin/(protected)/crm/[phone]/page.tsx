import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildCustomers, customerTemperature, formatPhone, phoneKey, whatsappUrl } from "@/lib/crm";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value);
}

export default async function AdminCrmCustomerPage({ params }: { params: Promise<{ phone: string }> }) {
  const { phone } = await params;
  const key = decodeURIComponent(phone);

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: {
      id: true,
      number: true,
      customerName: true,
      customerPhone: true,
      total: true,
      status: true,
      channel: true,
      origin: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      createdAt: true,
      items: { select: { name: true, qty: true, unitPrice: true } },
    },
  });

  const matching = orders.filter((order) => phoneKey(order.customerPhone) === key);
  if (matching.length === 0) notFound();

  const snapshots = matching.map((order) => ({
    ...order,
    total: Number(order.total),
    items: order.items.map((item) => ({ ...item, unitPrice: Number(item.unitPrice) })),
  }));
  const customer = buildCustomers(snapshots)[0];
  if (!customer) notFound();
  const temperature = customerTemperature(customer);
  const firstName = customer.name.split(" ")[0];
  const followupUrl = whatsappUrl(customer.phone, `Olá, ${firstName}! Aqui é da Sra Make Prudente. Passando para saber se posso te ajudar com algum produto ou reposição. 💗`);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/crm" className="text-[11px] font-bold text-rosa-profundo">← Voltar para clientes</Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-texto">{customer.name}</h1>
            <span className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase ${temperature.tone}`}>{temperature.label}</span>
          </div>
          <p className="mt-1 text-xs text-cinza">{formatPhone(customer.phone)} · cliente desde {dateTime(customer.firstOrderAt)}</p>
        </div>
        <div className="flex gap-2">
          <a href={followupUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white">Chamar no WhatsApp</a>
          <Link href="/admin/vendas/nova" className="rounded-xl bg-rosa-profundo px-4 py-2.5 text-xs font-extrabold text-white">Nova venda</Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="Pedidos" value={String(customer.orderCount)} />
        <Metric label="Finalizados" value={String(customer.completedOrderCount)} />
        <Metric label="Total comprado" value={money(customer.totalSpent)} />
        <Metric label="Ticket médio" value={money(customer.averageTicket)} />
        <Metric label="Sem comprar" value={`${customer.daysSinceLastOrder} dias`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.7fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-extrabold text-texto">Perfil comercial</h2>
            <dl className="mt-3 space-y-3 text-xs">
              <Row label="Origem" value={customer.origin} />
              <Row label="Canais" value={customer.channels.join(", ")} />
              <Row label="Última compra" value={dateTime(customer.lastOrderAt)} />
              <Row label="Primeira compra" value={dateTime(customer.firstOrderAt)} />
            </dl>
          </div>

          <div className="rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-extrabold text-texto">Preferências observadas</h2>
            {customer.favoriteProducts.length === 0 ? (
              <p className="mt-3 text-xs text-cinza">Ainda não há produtos suficientes para identificar preferências.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {customer.favoriteProducts.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between rounded-xl bg-creme/60 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-texto">{index + 1}. {item.name}</p>
                    </div>
                    <span className="ml-3 shrink-0 text-[10px] font-bold text-cinza">{item.qty} un.</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-rosa/15 bg-white shadow-sm">
          <div className="border-b border-rosa/10 px-4 py-3">
            <h2 className="text-sm font-extrabold text-texto">Histórico de compras</h2>
            <p className="mt-1 text-[10px] text-cinza">Pedidos já existentes no sistema vinculados pelo telefone.</p>
          </div>
          <div className="divide-y divide-rosa/10">
            {matching.map((order) => (
              <article key={order.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link href={`/admin/pedidos/${order.id}`} className="text-xs font-extrabold text-rosa-profundo">Pedido #{order.number}</Link>
                    <p className="mt-1 text-[10px] text-cinza">{dateTime(order.createdAt)} · {order.channel} · {order.status}</p>
                  </div>
                  <p className="text-sm font-extrabold text-texto">{money(Number(order.total))}</p>
                </div>
                <div className="mt-3 space-y-1.5">
                  {order.items.map((item, index) => (
                    <div key={`${order.id}-${index}`} className="flex justify-between gap-3 text-[11px]">
                      <span className="min-w-0 truncate text-cinza">{item.qty}× {item.name}</span>
                      <span className="shrink-0 font-bold text-texto">{money(Number(item.unitPrice) * item.qty)}</span>
                    </div>
                  ))}
                </div>
                {(order.utmSource || order.utmCampaign || order.origin) && (
                  <p className="mt-3 rounded-lg bg-creme/60 px-2.5 py-2 text-[9px] text-cinza">Origem: {order.utmSource || order.origin || "—"}{order.utmCampaign ? ` · campanha ${order.utmCampaign}` : ""}</p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm"><p className="text-[9px] font-bold uppercase tracking-wide text-cinza">{label}</p><p className="mt-1 text-base font-extrabold text-texto">{value}</p></div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3"><dt className="text-cinza">{label}</dt><dd className="text-right font-bold text-texto">{value}</dd></div>;
}
