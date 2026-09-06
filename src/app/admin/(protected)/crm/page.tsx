import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildCustomers, customerTemperature, formatPhone } from "@/lib/crm";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function date(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(value);
}

export default async function AdminCrmPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; segment?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const q = (params?.q || "").trim().toLowerCase();
  const segment = params?.segment || "all";

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
      createdAt: true,
      items: { select: { name: true, qty: true, unitPrice: true } },
    },
  });

  const allCustomers = buildCustomers(
    orders.map((order) => ({
      ...order,
      total: Number(order.total),
      items: order.items.map((item) => ({ ...item, unitPrice: Number(item.unitPrice) })),
    })),
  ).sort((a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime());

  const customers = allCustomers.filter((customer) => {
    const temperature = customerTemperature(customer).key;
    const matchesSearch = !q || customer.name.toLowerCase().includes(q) || customer.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""));
    const matchesSegment = segment === "all" || temperature === segment;
    return matchesSearch && matchesSegment;
  });

  const totalRevenue = allCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0);
  const averageTicket = allCustomers.reduce((sum, customer) => sum + customer.completedOrderCount, 0)
    ? totalRevenue / allCustomers.reduce((sum, customer) => sum + Math.max(customer.completedOrderCount, 0), 0)
    : 0;
  const active30 = allCustomers.filter((customer) => customer.daysSinceLastOrder < 30).length;
  const recovery = allCustomers.filter((customer) => customer.daysSinceLastOrder >= 60).length;
  const vip = allCustomers.filter((customer) => customerTemperature(customer).key === "vip").length;

  const segments = [
    ["all", "Todos"],
    ["active", "Ativos"],
    ["vip", "VIP"],
    ["attention", "30+ dias"],
    ["recover", "Reativar"],
    ["inactive", "90+ dias"],
  ] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-rosa-profundo">CRM Sra Make</p>
          <h1 className="font-serif text-2xl font-bold text-texto">Clientes e oportunidades</h1>
          <p className="mt-1 max-w-2xl text-xs text-cinza">Base criada automaticamente a partir do histórico de pedidos. Use para recompra, reativação e atendimento no WhatsApp.</p>
        </div>
        <Link href="/admin/vendas/nova" className="w-fit rounded-xl bg-rosa-profundo px-4 py-2.5 text-xs font-extrabold text-white">+ Nova venda</Link>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="Clientes" value={String(allCustomers.length)} />
        <Metric label="Ativos 30d" value={String(active30)} />
        <Metric label="Clientes VIP" value={String(vip)} />
        <Metric label="Para reativar" value={String(recovery)} attention={recovery > 0} />
        <Metric label="Ticket médio" value={money(averageTicket)} />
      </section>

      <section className="rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <form className="flex w-full max-w-md gap-2" action="/admin/crm">
            <input type="hidden" name="segment" value={segment} />
            <input name="q" defaultValue={params?.q || ""} placeholder="Buscar cliente ou telefone" className="min-w-0 flex-1 rounded-xl border border-rosa/20 bg-creme/30 px-3 py-2.5 text-xs outline-none focus:border-rosa-profundo" />
            <button className="rounded-xl border border-rosa/20 px-4 py-2.5 text-xs font-bold text-rosa-profundo">Buscar</button>
          </form>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {segments.map(([key, label]) => (
              <Link key={key} href={`/admin/crm?segment=${key}${params?.q ? `&q=${encodeURIComponent(params.q)}` : ""}`} className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-bold ${segment === key ? "bg-rosa-profundo text-white" : "bg-creme text-cinza hover:text-rosa-profundo"}`}>{label}</Link>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-rosa/15 bg-white shadow-sm">
        <div className="border-b border-rosa/10 px-4 py-3">
          <p className="text-xs font-bold text-texto">{customers.length} cliente{customers.length === 1 ? "" : "s"} encontrado{customers.length === 1 ? "" : "s"}</p>
        </div>

        {customers.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-cinza">Nenhum cliente encontrado neste filtro.</div>
        ) : (
          <div className="divide-y divide-rosa/10">
            {customers.map((customer) => {
              const temperature = customerTemperature(customer);
              return (
                <article key={customer.key} className="grid gap-3 px-4 py-4 transition hover:bg-creme/30 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/crm/${encodeURIComponent(customer.key)}`} className="truncate text-sm font-extrabold text-texto hover:text-rosa-profundo">{customer.name}</Link>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-extrabold uppercase ${temperature.tone}`}>{temperature.label}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-cinza">{formatPhone(customer.phone)} · última compra {date(customer.lastOrderAt)} · {customer.daysSinceLastOrder}d</p>
                    {customer.favoriteProducts.length > 0 && <p className="mt-1 truncate text-[10px] text-cinza">Mais comprados: {customer.favoriteProducts.map((item) => item.name).join(" · ")}</p>}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center sm:text-left">
                    <div><p className="text-[9px] uppercase text-cinza">Compras</p><p className="text-xs font-bold text-texto">{customer.orderCount}</p></div>
                    <div><p className="text-[9px] uppercase text-cinza">Total</p><p className="text-xs font-bold text-texto">{money(customer.totalSpent)}</p></div>
                    <div><p className="text-[9px] uppercase text-cinza">Ticket</p><p className="text-xs font-bold text-texto">{money(customer.averageTicket)}</p></div>
                  </div>

                  <div className="flex gap-2 sm:justify-end">
                    <a href={customer.whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-center text-[11px] font-extrabold text-white sm:flex-none">WhatsApp</a>
                    <Link href={`/admin/crm/${encodeURIComponent(customer.key)}`} className="flex-1 rounded-xl border border-rosa/20 px-3 py-2 text-center text-[11px] font-extrabold text-rosa-profundo sm:flex-none">Ver cliente</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, attention = false }: { label: string; value: string; attention?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${attention ? "border-amber-200 bg-amber-50" : "border-rosa/15 bg-white"}`}>
      <p className="text-[9px] font-bold uppercase tracking-wide text-cinza">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-texto">{value}</p>
    </div>
  );
}
