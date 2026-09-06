import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPhone, whatsappUrl } from "@/lib/crm";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function date(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(value);
}

function classify(params: { daysSinceLastOrder: number | null; orderCount: number; totalSpent: number }) {
  if (params.daysSinceLastOrder === null) return { key: "prospect", label: "Prospect", tone: "bg-sky-50 text-sky-700" };
  if (params.daysSinceLastOrder >= 90) return { key: "inactive", label: "+90 dias", tone: "bg-zinc-100 text-zinc-700" };
  if (params.daysSinceLastOrder >= 60) return { key: "recover", label: "Reativar", tone: "bg-amber-50 text-amber-800" };
  if (params.daysSinceLastOrder >= 30) return { key: "attention", label: "Atenção", tone: "bg-orange-50 text-orange-800" };
  if (params.orderCount >= 3 || params.totalSpent >= 150) return { key: "vip", label: "VIP", tone: "bg-rosa/15 text-rosa-profundo" };
  return { key: "active", label: "Ativo", tone: "bg-emerald-50 text-emerald-700" };
}

export default async function AdminCrmPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; segment?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const q = (params?.q || "").trim().toLowerCase();
  const segment = params?.segment || "all";
  const now = new Date();

  const persisted = await prisma.customer.findMany({
    orderBy: { updatedAt: "desc" },
    take: 2000,
    select: {
      id: true,
      name: true,
      phone: true,
      source: true,
      marketingConsent: true,
      lastContactAt: true,
      createdAt: true,
      orders: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          total: true,
          channel: true,
          createdAt: true,
          items: { select: { name: true, qty: true } },
        },
      },
      leads: {
        where: { stage: { notIn: ["VENDIDO", "PERDIDO"] } },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: { id: true, stage: true, product: { select: { name: true } } },
      },
      followUps: {
        where: { status: "PENDENTE" },
        orderBy: { dueAt: "asc" },
        take: 1,
        select: { dueAt: true },
      },
    },
  });

  const rows = persisted.map((customer) => {
    const completed = customer.orders.filter((order) => order.status === "FINALIZADO");
    const totalSpent = completed.reduce((sum, order) => sum + Number(order.total), 0);
    const lastCompleted = completed[0] || null;
    const daysSinceLastOrder = lastCompleted
      ? Math.max(0, Math.floor((now.getTime() - lastCompleted.createdAt.getTime()) / 86_400_000))
      : null;
    const productQty = new Map<string, number>();
    for (const order of completed) {
      for (const item of order.items) productQty.set(item.name, (productQty.get(item.name) ?? 0) + item.qty);
    }
    const favorites = Array.from(productQty.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name);
    const status = classify({ daysSinceLastOrder, orderCount: completed.length, totalSpent });
    return {
      ...customer,
      completedCount: completed.length,
      totalSpent,
      averageTicket: completed.length ? totalSpent / completed.length : 0,
      lastOrderAt: lastCompleted?.createdAt || null,
      daysSinceLastOrder,
      favorites,
      status,
    };
  });

  const filtered = rows.filter((customer) => {
    const matchesSearch = !q || customer.name.toLowerCase().includes(q) || customer.phone.includes(q.replace(/\D/g, ""));
    const matchesSegment = segment === "all" || customer.status.key === segment;
    return matchesSearch && matchesSegment;
  });

  const completedOrders = rows.reduce((sum, customer) => sum + customer.completedCount, 0);
  const totalRevenue = rows.reduce((sum, customer) => sum + customer.totalSpent, 0);
  const prospects = rows.filter((customer) => customer.status.key === "prospect").length;
  const vip = rows.filter((customer) => customer.status.key === "vip").length;
  const recovery = rows.filter((customer) => ["recover", "inactive"].includes(customer.status.key)).length;
  const averageTicket = completedOrders ? totalRevenue / completedOrders : 0;

  const segments = [
    ["all", "Todos"],
    ["prospect", "Prospects"],
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
          <h1 className="font-serif text-2xl font-bold text-texto">Clientes e contatos</h1>
          <p className="mt-1 max-w-2xl text-xs text-cinza">Todos os contatos ficam aqui, inclusive quem chamou no WhatsApp e ainda não realizou nenhuma compra.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/crm/atendimento" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white">Atender no WhatsApp</Link>
          <Link href="/admin/crm/novo" className="rounded-xl bg-rosa-profundo px-4 py-2.5 text-xs font-extrabold text-white">+ Novo contato</Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="Contatos" value={String(rows.length)} />
        <Metric label="Prospects" value={String(prospects)} />
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
        <div className="border-b border-rosa/10 px-4 py-3"><p className="text-xs font-bold text-texto">{filtered.length} contato{filtered.length === 1 ? "" : "s"} encontrado{filtered.length === 1 ? "" : "s"}</p></div>
        {filtered.length === 0 ? <div className="px-4 py-10 text-center text-xs text-cinza">Nenhum contato encontrado neste filtro.</div> : (
          <div className="divide-y divide-rosa/10">
            {filtered.map((customer) => (
              <article key={customer.id} className="grid gap-3 px-4 py-4 transition hover:bg-creme/30 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/crm/${encodeURIComponent(customer.phone)}`} className="truncate text-sm font-extrabold text-texto hover:text-rosa-profundo">{customer.name}</Link>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-extrabold uppercase ${customer.status.tone}`}>{customer.status.label}</span>
                    {customer.followUps[0] && <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-800">retorno {date(customer.followUps[0].dueAt)}</span>}
                  </div>
                  <p className="mt-1 text-[11px] text-cinza">{formatPhone(customer.phone)} · {customer.lastOrderAt ? `última compra ${date(customer.lastOrderAt)}` : "ainda não comprou"} · origem {customer.source || "não informada"}</p>
                  {customer.leads[0] && <p className="mt-1 truncate text-[10px] text-cinza">Em aberto: {customer.leads[0].stage.replaceAll("_", " ").toLowerCase()}{customer.leads[0].product?.name ? ` · ${customer.leads[0].product.name}` : ""}</p>}
                  {!customer.leads[0] && customer.favorites.length > 0 && <p className="mt-1 truncate text-[10px] text-cinza">Mais comprados: {customer.favorites.join(" · ")}</p>}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center sm:text-left">
                  <div><p className="text-[9px] uppercase text-cinza">Compras</p><p className="text-xs font-bold text-texto">{customer.completedCount}</p></div>
                  <div><p className="text-[9px] uppercase text-cinza">Total</p><p className="text-xs font-bold text-texto">{money(customer.totalSpent)}</p></div>
                  <div><p className="text-[9px] uppercase text-cinza">Ticket</p><p className="text-xs font-bold text-texto">{money(customer.averageTicket)}</p></div>
                </div>
                <div className="flex gap-2 sm:justify-end">
                  <a href={whatsappUrl(customer.phone, `Olá, ${customer.name.split(" ")[0]}! Aqui é da Sra Make Prudente.`)} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-center text-[11px] font-extrabold text-white sm:flex-none">WhatsApp</a>
                  <Link href={`/admin/crm/${encodeURIComponent(customer.phone)}`} className="flex-1 rounded-xl border border-rosa/20 px-3 py-2 text-center text-[11px] font-extrabold text-rosa-profundo sm:flex-none">Ver</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, attention = false }: { label: string; value: string; attention?: boolean }) {
  return <div className={`rounded-2xl border p-4 shadow-sm ${attention ? "border-amber-200 bg-amber-50" : "border-rosa/15 bg-white"}`}><p className="text-[9px] font-bold uppercase tracking-wide text-cinza">{label}</p><p className="mt-1 text-lg font-extrabold text-texto">{value}</p></div>;
}
