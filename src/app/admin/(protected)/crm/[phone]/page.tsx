import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPhone, normalizePhone, whatsappUrl } from "@/lib/crm";

function money(value: unknown) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function dateTime(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value);
}

function stageLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

export default async function AdminCrmCustomerPage({ params }: { params: Promise<{ phone: string }> }) {
  const { phone } = await params;
  const key = normalizePhone(decodeURIComponent(phone)).replace(/^55(?=\d{10,11}$)/, "");
  if (!key) notFound();

  const customer = await prisma.customer.findUnique({
    where: { phone: key },
    include: {
      orders: { orderBy: { createdAt: "desc" }, include: { items: true } },
      leads: {
        orderBy: { updatedAt: "desc" },
        include: { product: { select: { name: true } }, followUps: { orderBy: { dueAt: "desc" }, take: 3 } },
      },
      followUps: { orderBy: { dueAt: "desc" }, take: 20 },
    },
  });
  if (!customer) notFound();

  const completed = customer.orders.filter((order) => order.status === "FINALIZADO");
  const totalSpent = completed.reduce((sum, order) => sum + Number(order.total), 0);
  const averageTicket = completed.length ? totalSpent / completed.length : 0;
  const lastOrder = completed[0] || null;
  const daysSinceLastOrder = lastOrder ? Math.max(0, Math.floor((Date.now() - lastOrder.createdAt.getTime()) / 86_400_000)) : null;
  const productQty = new Map<string, number>();
  for (const order of completed) {
    for (const item of order.items) productQty.set(item.name, (productQty.get(item.name) ?? 0) + item.qty);
  }
  const favorites = Array.from(productQty.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const openLeads = customer.leads.filter((lead) => !["VENDIDO", "PERDIDO"].includes(lead.stage));
  const pendingFollowUps = customer.followUps.filter((item) => item.status === "PENDENTE");
  const firstName = customer.name.split(" ")[0];
  const followupUrl = whatsappUrl(customer.phone, `Olá, ${firstName}! Aqui é da Sra Make Prudente. Passando para dar continuidade ao nosso atendimento.`);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/crm" className="text-[11px] font-bold text-rosa-profundo">← Voltar para clientes</Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-texto">{customer.name}</h1>
            <span className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase ${completed.length ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>{completed.length ? "Cliente" : "Prospect"}</span>
            {customer.marketingConsent && <span className="rounded-full bg-rosa/15 px-2.5 py-1 text-[9px] font-extrabold uppercase text-rosa-profundo">Aceita novidades</span>}
          </div>
          <p className="mt-1 text-xs text-cinza">{formatPhone(customer.phone)} · contato criado em {dateTime(customer.createdAt)} · origem {customer.source || "não informada"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/crm/atendimento?customerId=${encodeURIComponent(customer.id)}`} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white">Indicar produto</Link>
          <a href={followupUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-emerald-600 px-4 py-2.5 text-xs font-extrabold text-emerald-700">WhatsApp</a>
          <Link href={`/admin/crm/follow-ups/novo?customerId=${encodeURIComponent(customer.id)}`} className="rounded-xl border border-rosa/20 px-4 py-2.5 text-xs font-extrabold text-rosa-profundo">Agendar retorno</Link>
          <Link href="/admin/vendas/nova" className="rounded-xl bg-rosa-profundo px-4 py-2.5 text-xs font-extrabold text-white">Nova venda</Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Metric label="Compras" value={String(completed.length)} />
        <Metric label="Total comprado" value={money(totalSpent)} />
        <Metric label="Ticket médio" value={money(averageTicket)} />
        <Metric label="Oportunidades" value={String(openLeads.length)} />
        <Metric label="Follow-ups" value={String(pendingFollowUps.length)} />
        <Metric label="Sem comprar" value={daysSinceLastOrder === null ? "Nunca" : `${daysSinceLastOrder} dias`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.2fr_1.6fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-extrabold text-texto">Perfil comercial</h2>
            <dl className="mt-3 space-y-3 text-xs">
              <Row label="Origem" value={customer.source || "—"} />
              <Row label="Último contato" value={dateTime(customer.lastContactAt)} />
              <Row label="Última compra" value={dateTime(lastOrder?.createdAt || null)} />
              <Row label="Marketing" value={customer.marketingConsent ? "Consentiu" : "Não registrado"} />
            </dl>
            {customer.notes && <p className="mt-4 rounded-xl bg-creme/60 p-3 text-[11px] leading-relaxed text-cinza">{customer.notes}</p>}
          </div>

          <div className="rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-extrabold text-texto">Preferências por compra</h2>
            {favorites.length === 0 ? <p className="mt-3 text-xs text-cinza">Ainda não há compra suficiente para identificar preferências.</p> : (
              <div className="mt-3 space-y-2">{favorites.map(([name, qty], index) => <div key={name} className="flex items-center justify-between rounded-xl bg-creme/60 px-3 py-2.5"><p className="min-w-0 truncate text-xs font-bold text-texto">{index + 1}. {name}</p><span className="ml-3 shrink-0 text-[10px] font-bold text-cinza">{qty} un.</span></div>)}</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-rosa/15 bg-white shadow-sm">
            <div className="border-b border-rosa/10 px-4 py-3"><h2 className="text-sm font-extrabold text-texto">Oportunidades</h2></div>
            {customer.leads.length === 0 ? <p className="p-5 text-center text-xs text-cinza">Nenhuma oportunidade registrada.</p> : (
              <div className="divide-y divide-rosa/10">
                {customer.leads.map((lead) => (
                  <div key={lead.id} className="p-4">
                    <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-extrabold text-texto">{lead.product?.name || "Interesse sem produto definido"}</p><p className="mt-1 text-[10px] text-cinza">{stageLabel(lead.stage)} · atualizado {dateTime(lead.updatedAt)}</p></div>{lead.estimatedValue != null && <span className="shrink-0 text-xs font-extrabold text-rosa-profundo">{money(lead.estimatedValue)}</span>}</div>
                    {lead.notes && <p className="mt-2 text-[10px] leading-relaxed text-cinza">{lead.notes}</p>}
                    {lead.lostReason && <p className="mt-2 rounded-lg bg-zinc-50 px-2.5 py-2 text-[10px] text-zinc-600">Motivo da perda: {lead.lostReason}</p>}
                    {!['VENDIDO', 'PERDIDO'].includes(lead.stage) && <div className="mt-3"><Link href={`/admin/crm/follow-ups/novo?customerId=${encodeURIComponent(customer.id)}&leadId=${encodeURIComponent(lead.id)}`} className="text-[10px] font-extrabold text-rosa-profundo">+ Agendar retorno desta oportunidade</Link></div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-rosa/15 bg-white shadow-sm">
            <div className="border-b border-rosa/10 px-4 py-3"><h2 className="text-sm font-extrabold text-texto">Agenda de retornos</h2></div>
            {customer.followUps.length === 0 ? <p className="p-5 text-center text-xs text-cinza">Nenhum retorno registrado.</p> : (
              <div className="divide-y divide-rosa/10">{customer.followUps.map((item) => <div key={item.id} className="p-3"><div className="flex items-center justify-between gap-2"><p className="text-[11px] font-bold text-texto">{item.reason}</p><span className={`rounded-full px-2 py-1 text-[8px] font-extrabold uppercase ${item.status === "PENDENTE" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{item.status}</span></div><p className="mt-1 text-[9px] text-cinza">{dateTime(item.dueAt)}</p></div>)}</div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-rosa/15 bg-white shadow-sm">
          <div className="border-b border-rosa/10 px-4 py-3"><h2 className="text-sm font-extrabold text-texto">Histórico de pedidos</h2><p className="mt-1 text-[10px] text-cinza">Pedidos vinculados automaticamente pelo telefone.</p></div>
          {customer.orders.length === 0 ? <div className="p-8 text-center"><p className="text-xs font-bold text-texto">Ainda não comprou</p><p className="mt-1 text-[10px] text-cinza">O contato continua no CRM e pode ser trabalhado pelo funil normalmente.</p></div> : (
            <div className="divide-y divide-rosa/10">
              {customer.orders.map((order) => (
                <article key={order.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><Link href={`/admin/pedidos/${order.id}`} className="text-xs font-extrabold text-rosa-profundo">Pedido #{order.number}</Link><p className="mt-1 text-[10px] text-cinza">{dateTime(order.createdAt)} · {order.channel} · {order.status}</p></div><p className="text-sm font-extrabold text-texto">{money(order.total)}</p></div>
                  <div className="mt-3 space-y-1.5">{order.items.map((item, index) => <div key={`${order.id}-${index}`} className="flex justify-between gap-3 text-[11px]"><span className="min-w-0 truncate text-cinza">{item.qty}× {item.name}{item.variantName ? ` (${item.variantName})` : ""}</span><span className="shrink-0 font-bold text-texto">{money(Number(item.unitPrice) * item.qty)}</span></div>)}</div>
                </article>
              ))}
            </div>
          )}
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
