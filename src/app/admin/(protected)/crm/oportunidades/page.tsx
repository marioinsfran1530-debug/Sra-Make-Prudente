import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { whatsappUrl } from "@/lib/crm";

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value);
}

function money(value: unknown) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

export default async function OportunidadesPage() {
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);
  const staleDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [followUps, awaitingPayment, staleLeads, reactivation] = await Promise.all([
    prisma.crmFollowUp.findMany({
      where: { status: "PENDENTE", dueAt: { lte: endToday } },
      orderBy: { dueAt: "asc" },
      include: { customer: { select: { id: true, name: true, phone: true } }, lead: { include: { product: { select: { name: true } } } } },
      take: 100,
    }),
    prisma.crmLead.findMany({
      where: { stage: "AGUARDANDO_PAGAMENTO" },
      orderBy: { updatedAt: "asc" },
      include: { customer: { select: { id: true, name: true, phone: true } }, product: { select: { name: true } } },
      take: 100,
    }),
    prisma.crmLead.findMany({
      where: { stage: { in: ["NOVO", "ATENDIMENTO", "PRODUTO_INDICADO"] }, updatedAt: { lte: staleDate } },
      orderBy: { updatedAt: "asc" },
      include: { customer: { select: { id: true, name: true, phone: true } }, product: { select: { name: true } } },
      take: 100,
    }),
    prisma.customer.findMany({
      where: {
        orders: { some: { status: "FINALIZADO", createdAt: { lte: sixtyDaysAgo } } },
        NOT: { orders: { some: { status: "FINALIZADO", createdAt: { gt: sixtyDaysAgo } } } },
        followUps: { none: { status: "PENDENTE" } },
      },
      orderBy: { lastContactAt: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        orders: {
          where: { status: "FINALIZADO" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true, total: true, items: { select: { name: true, qty: true } } },
        },
      },
      take: 100,
    }),
  ]);

  const overdue = followUps.filter((item) => item.dueAt < startToday).length;
  const totalActions = followUps.length + awaitingPayment.length + staleLeads.length + reactivation.length;

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-rosa-profundo">CRM Sra Make</p>
        <h1 className="font-serif text-2xl font-bold text-texto">Oportunidades de hoje</h1>
        <p className="mt-1 text-xs leading-relaxed text-cinza">Fila prática de quem merece atenção agora, sem disparo automático e sem API oficial do WhatsApp.</p>
      </div>

      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        <Metric label="Ações sugeridas" value={String(totalActions)} />
        <Metric label="Follow-ups" value={String(followUps.length)} />
        <Metric label="Atrasados" value={String(overdue)} attention={overdue > 0} />
        <Metric label="Aguard. pagamento" value={String(awaitingPayment.length)} attention={awaitingPayment.length > 0} />
        <Metric label="Reativação" value={String(reactivation.length)} />
      </section>

      <OpportunitySection title="1. Retornos vencidos ou de hoje" subtitle="Tarefas que já foram agendadas pela equipe." empty="Nenhum follow-up para hoje.">
        {followUps.map((item) => {
          const message = item.lead?.product?.name
            ? `Olá, ${item.customer.name.split(" ")[0]}! Aqui é da Sra Make Prudente. Passando para saber se posso te ajudar com ${item.lead.product.name}.`
            : `Olá, ${item.customer.name.split(" ")[0]}! Aqui é da Sra Make Prudente. Passando para dar continuidade ao nosso atendimento.`;
          return <OpportunityRow key={item.id} name={item.customer.name} detail={`${item.reason} · ${dateTime(item.dueAt)}`} phone={item.customer.phone} customerId={item.customer.id} leadId={item.leadId} whatsapp={whatsappUrl(item.customer.phone, message)} badge={item.dueAt < startToday ? "Atrasado" : "Hoje"} />;
        })}
      </OpportunitySection>

      <OpportunitySection title="2. Aguardando pagamento" subtitle="Oportunidades que já chegaram perto da venda." empty="Nenhum cliente aguardando pagamento.">
        {awaitingPayment.map((lead) => <OpportunityRow key={lead.id} name={lead.customer.name} detail={`${lead.product?.name || "Produto não definido"} · ${money(lead.estimatedValue)}`} phone={lead.customer.phone} customerId={lead.customer.id} leadId={lead.id} whatsapp={whatsappUrl(lead.customer.phone, `Olá, ${lead.customer.name.split(" ")[0]}! Aqui é da Sra Make Prudente. Posso te ajudar a concluir seu pedido?`)} badge="Quase venda" />)}
      </OpportunitySection>

      <OpportunitySection title="3. Atendimento parado há mais de 48h" subtitle="Contatos abertos que podem estar sendo esquecidos." empty="Nenhum atendimento parado.">
        {staleLeads.map((lead) => <OpportunityRow key={lead.id} name={lead.customer.name} detail={`${lead.product?.name || "Interesse não definido"} · sem atualização desde ${dateTime(lead.updatedAt)}`} phone={lead.customer.phone} customerId={lead.customer.id} leadId={lead.id} whatsapp={whatsappUrl(lead.customer.phone, `Olá, ${lead.customer.name.split(" ")[0]}! Aqui é da Sra Make Prudente. Ficou alguma dúvida sobre o produto que vimos?`)} badge="Retomar" />)}
      </OpportunitySection>

      <OpportunitySection title="4. Clientes para reativação" subtitle="Compraram, mas estão há pelo menos 60 dias sem nova compra e não têm retorno pendente." empty="Nenhuma reativação prioritária agora.">
        {reactivation.map((customer) => {
          const last = customer.orders[0];
          const favorite = last?.items[0]?.name || "sua última compra";
          return <OpportunityRow key={customer.id} name={customer.name} detail={`Última compra ${last ? dateTime(last.createdAt) : "—"} · ${last ? money(last.total) : "—"} · ${favorite}`} phone={customer.phone} customerId={customer.id} whatsapp={whatsappUrl(customer.phone, `Olá, ${customer.name.split(" ")[0]}! Aqui é da Sra Make Prudente. Faz um tempinho desde sua última compra e queria saber se precisa repor algum produto.`)} badge="Reativar" />;
        })}
      </OpportunitySection>
    </div>
  );
}

function Metric({ label, value, attention = false }: { label: string; value: string; attention?: boolean }) {
  return <div className={`rounded-2xl border p-3.5 shadow-sm sm:p-4 ${attention ? "border-amber-200 bg-amber-50" : "border-rosa/15 bg-white"}`}><p className="text-[9px] font-bold uppercase tracking-wide text-cinza">{label}</p><p className="mt-1 text-lg font-extrabold text-texto">{value}</p></div>;
}

function OpportunitySection({ title, subtitle, empty, children }: { title: string; subtitle: string; empty: string; children: React.ReactNode }) {
  const rows = Array.isArray(children) ? children : [children];
  const hasRows = rows.some(Boolean);
  return <section className="overflow-hidden rounded-2xl border border-rosa/15 bg-white shadow-sm"><div className="border-b border-rosa/10 px-4 py-3"><h2 className="text-sm font-extrabold text-texto">{title}</h2><p className="mt-1 text-[10px] leading-relaxed text-cinza">{subtitle}</p></div>{hasRows ? <div className="divide-y divide-rosa/10">{children}</div> : <p className="px-4 py-8 text-center text-xs text-cinza">{empty}</p>}</section>;
}

function OpportunityRow({ name, detail, phone, customerId, leadId, whatsapp, badge }: { name: string; detail: string; phone: string; customerId: string; leadId?: string | null; whatsapp: string; badge: string }) {
  return (
    <article className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/crm/${encodeURIComponent(phone)}`} className="text-sm font-extrabold text-texto active:text-rosa-profundo sm:hover:text-rosa-profundo">{name}</Link>
          <span className="rounded-full bg-creme px-2 py-1 text-[9px] font-extrabold uppercase text-rosa-profundo">{badge}</span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-cinza">{detail}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-emerald-600 px-3 py-3 text-center text-[11px] font-extrabold text-white">WhatsApp</a>
        <Link href={`/admin/crm/follow-ups/novo?customerId=${encodeURIComponent(customerId)}${leadId ? `&leadId=${encodeURIComponent(leadId)}` : ""}`} className="rounded-xl border border-rosa/20 px-3 py-3 text-center text-[11px] font-extrabold text-rosa-profundo">Agendar</Link>
      </div>
    </article>
  );
}
