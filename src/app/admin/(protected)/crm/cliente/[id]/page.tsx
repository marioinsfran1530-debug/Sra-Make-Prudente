import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPhone, whatsappUrl } from "@/lib/crm";
import { formatCrmDateTime } from "@/lib/crm-time";
import { listCrmTags, listCustomerTags, listCustomerTimeline } from "@/lib/crm-activity";
import {
  addCustomerNoteAction,
  addCustomerTagAction,
  moveLeadAction,
  removeCustomerTagAction,
} from "../../actions";

export const dynamic = "force-dynamic";

const stageLabels: Record<string, string> = {
  NOVO: "Novo",
  ATENDIMENTO: "Em atendimento",
  PRODUTO_INDICADO: "Produto indicado",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  VENDIDO: "Vendido",
  PERDIDO: "Perdido",
  POS_VENDA: "Pós-venda",
  RECOMPRA: "Recompra",
};

const timelineLabels: Record<string, string> = {
  LEAD_CREATED: "Atendimento criado",
  STAGE_CHANGED: "Etapa alterada",
  LEAD_UPDATED: "Oportunidade atualizada",
  FOLLOW_UP_CREATED: "Retorno agendado",
  FOLLOW_UP_COMPLETED: "Retorno concluído",
  NOTE: "Anotação",
  TAG_ADDED: "Etiqueta adicionada",
  TAG_REMOVED: "Etiqueta removida",
  PRODUCT_INDICATED: "Produto indicado",
  ORDER_CREATED: "Pedido criado",
  ORDER_STATUS_CHANGED: "Pedido atualizado",
  ORDER_FINALIZED: "Venda finalizada",
};

function money(value: unknown) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function tagTone(color: string | null) {
  const map: Record<string, string> = {
    sky: "bg-sky-50 text-sky-700",
    pink: "bg-pink-50 text-pink-700",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
  };
  return map[color || ""] || "bg-creme text-rosa-profundo";
}

type LeadCampaignRow = {
  id: string;
  campaign: string | null;
  campaignContent: string | null;
  campaignCode: string | null;
};

export default async function CustomerWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, include: { items: true } },
      leads: {
        orderBy: { updatedAt: "desc" },
        include: { product: { select: { id: true, name: true, brand: true } } },
      },
      followUps: { orderBy: { dueAt: "desc" }, take: 100 },
    },
  });
  if (!customer) notFound();

  const [customerTags, allTags, timeline, campaignRows] = await Promise.all([
    listCustomerTags(customer.id),
    listCrmTags(),
    listCustomerTimeline(customer.id, 120),
    prisma.$queryRaw<LeadCampaignRow[]>`
      SELECT "id", "campaign", "campaignContent", "campaignCode"
      FROM "CrmLead"
      WHERE "customerId" = ${customer.id}
    `,
  ]);

  const campaignMap = new Map(campaignRows.map((row) => [row.id, row]));
  const attachedTagIds = new Set(customerTags.map((tag) => tag.id));
  const availableTags = allTags.filter((tag) => !attachedTagIds.has(tag.id));
  const completed = customer.orders.filter((order) => order.status === "FINALIZADO");
  const totalSpent = completed.reduce((sum, order) => sum + Number(order.total), 0);
  const averageTicket = completed.length ? totalSpent / completed.length : 0;
  const openLeads = customer.leads.filter((lead) => !["VENDIDO", "PERDIDO"].includes(lead.stage));
  const activeLead = openLeads[0] || null;
  const pendingFollowUps = customer.followUps.filter((item) => item.status === "PENDENTE").sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  const firstName = customer.name.split(" ")[0];
  const whatsapp = whatsappUrl(customer.phone, `Olá, ${firstName}! Aqui é da Sra Make Prudente. Passando para dar continuidade ao nosso atendimento.`);
  const activeCampaign = activeLead ? campaignMap.get(activeLead.id) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link href="/admin/crm/central" className="text-[11px] font-bold text-rosa-profundo">← Central de atendimento</Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="truncate font-serif text-2xl font-bold text-texto">{customer.name}</h1>
            <span className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase ${completed.length ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>{completed.length ? "Cliente" : "Prospect"}</span>
          </div>
          <p className="mt-1 text-xs text-cinza">{formatPhone(customer.phone)} · origem {customer.source || "não informada"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {customerTags.map((tag) => (
              <form key={tag.id} action={removeCustomerTagAction}>
                <input type="hidden" name="customerId" value={customer.id} />
                <input type="hidden" name="tagId" value={tag.id} />
                <button title="Remover etiqueta" className={`rounded-full px-2.5 py-1.5 text-[9px] font-extrabold ${tagTone(tag.color)}`}>{tag.name} ×</button>
              </form>
            ))}
            {customerTags.length === 0 && <span className="text-[10px] text-cinza">Sem etiquetas.</span>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-emerald-600 px-4 py-3 text-center text-xs font-extrabold text-white">WhatsApp</a>
          <Link href={`/admin/crm/atendimento?customerId=${encodeURIComponent(customer.id)}`} className="rounded-xl border border-emerald-600 px-4 py-3 text-center text-xs font-extrabold text-emerald-700">Indicar produto</Link>
          <Link href={`/admin/crm/follow-ups/novo?customerId=${encodeURIComponent(customer.id)}${activeLead ? `&leadId=${encodeURIComponent(activeLead.id)}` : ""}`} className="rounded-xl border border-rosa/20 px-4 py-3 text-center text-xs font-extrabold text-rosa-profundo">Agendar retorno</Link>
          <Link href="/admin/vendas/nova" className="rounded-xl bg-rosa-profundo px-4 py-3 text-center text-xs font-extrabold text-white">Criar pedido</Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
        <Metric label="Compras" value={String(completed.length)} />
        <Metric label="Total comprado" value={money(totalSpent)} />
        <Metric label="Ticket médio" value={money(averageTicket)} />
        <Metric label="Oportunidades" value={String(openLeads.length)} />
        <Metric label="Próximo retorno" value={pendingFollowUps[0] ? formatCrmDateTime(pendingFollowUps[0].dueAt) : "—"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_1.35fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-cinza">Oportunidade atual</p>
                <h2 className="mt-1 text-sm font-extrabold text-texto">{activeLead?.product?.name || "Interesse ainda não definido"}</h2>
              </div>
              {activeLead && <span className="rounded-full bg-creme px-2.5 py-1.5 text-[9px] font-extrabold text-rosa-profundo">{stageLabels[activeLead.stage] || activeLead.stage}</span>}
            </div>

            {activeLead ? (
              <>
                <dl className="mt-4 space-y-2.5 text-xs">
                  <Row label="Valor estimado" value={activeLead.estimatedValue != null ? money(activeLead.estimatedValue) : "—"} />
                  <Row label="Origem" value={activeLead.source || customer.source || "—"} />
                  <Row label="Campanha" value={activeCampaign?.campaign || "—"} />
                  <Row label="Criativo/conteúdo" value={activeCampaign?.campaignContent || "—"} />
                  <Row label="Código" value={activeCampaign?.campaignCode || "—"} />
                </dl>
                {activeLead.notes && <p className="mt-3 rounded-xl bg-creme/60 p-3 text-[11px] leading-relaxed text-cinza">{activeLead.notes}</p>}

                <div className="mt-4 border-t border-rosa/10 pt-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-cinza">Mover etapa</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      ["ATENDIMENTO", "Atendimento"],
                      ["PRODUTO_INDICADO", "Produto indicado"],
                      ["AGUARDANDO_PAGAMENTO", "Aguard. pagamento"],
                      ["VENDIDO", "Vendido"],
                      ["POS_VENDA", "Pós-venda"],
                      ["RECOMPRA", "Recompra"],
                    ].map(([stage, label]) => (
                      <form key={stage} action={moveLeadAction}>
                        <input type="hidden" name="id" value={activeLead.id} />
                        <input type="hidden" name="stage" value={stage} />
                        <button disabled={activeLead.stage === stage} className={`w-full rounded-xl border px-2 py-2.5 text-[10px] font-extrabold ${activeLead.stage === stage ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-rosa/15 text-rosa-profundo"}`}>{label}</button>
                      </form>
                    ))}
                  </div>
                  <form action={moveLeadAction} className="mt-2 flex gap-2">
                    <input type="hidden" name="id" value={activeLead.id} />
                    <input type="hidden" name="stage" value="PERDIDO" />
                    <input name="lostReason" required placeholder="Motivo da perda" className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2.5 text-xs outline-none" />
                    <button className="rounded-xl border border-zinc-300 px-3 py-2.5 text-[10px] font-extrabold text-zinc-700">Perdido</button>
                  </form>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl bg-creme/50 p-4 text-xs text-cinza">
                Não há oportunidade aberta. Use <strong>Indicar produto</strong> para iniciar uma nova negociação.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-texto">Etiquetas</h2>
              <Link href="/admin/crm/etiquetas" className="text-[10px] font-extrabold text-rosa-profundo">Gerenciar</Link>
            </div>
            {availableTags.length > 0 ? (
              <form action={addCustomerTagAction} className="mt-3 flex gap-2">
                <input type="hidden" name="customerId" value={customer.id} />
                <select name="tagId" required className="min-w-0 flex-1 rounded-xl border border-rosa/20 bg-white px-3 py-3 text-xs outline-none">
                  <option value="">Adicionar etiqueta...</option>
                  {availableTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                </select>
                <button className="rounded-xl bg-rosa-profundo px-4 py-3 text-[10px] font-extrabold text-white">Adicionar</button>
              </form>
            ) : <p className="mt-3 text-xs text-cinza">Todas as etiquetas disponíveis já estão aplicadas.</p>}
          </div>

          <div className="rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-extrabold text-texto">Adicionar anotação</h2>
            <form action={addCustomerNoteAction} className="mt-3 space-y-2">
              <input type="hidden" name="customerId" value={customer.id} />
              {activeLead && <input type="hidden" name="leadId" value={activeLead.id} />}
              <textarea name="body" required rows={3} maxLength={1200} placeholder="Ex.: prefere acabamento matte, pediu para chamar depois do pagamento..." className="w-full resize-y rounded-xl border border-rosa/20 px-3 py-3 text-base outline-none focus:border-rosa-profundo sm:text-sm" />
              <button className="w-full rounded-xl border border-rosa-profundo px-4 py-3 text-xs font-extrabold text-rosa-profundo">Salvar na timeline</button>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-rosa/15 bg-white shadow-sm">
            <div className="border-b border-rosa/10 px-4 py-3">
              <h2 className="text-sm font-extrabold text-texto">Timeline comercial</h2>
              <p className="mt-1 text-[10px] text-cinza">Histórico estruturado do relacionamento com a cliente.</p>
            </div>
            {timeline.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-cinza">A timeline começa a ser preenchida com as próximas ações do CRM.</p>
            ) : (
              <div className="divide-y divide-rosa/10">
                {timeline.map((item) => (
                  <article key={item.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-creme px-2 py-1 text-[9px] font-extrabold text-rosa-profundo">{timelineLabels[item.kind] || item.kind}</span>
                        {item.channel && <span className="text-[9px] font-bold text-cinza">{item.channel}</span>}
                      </div>
                      <span className="text-[9px] text-cinza">{formatCrmDateTime(item.createdAt)}</span>
                    </div>
                    {item.body && <p className="mt-2 text-[11px] leading-relaxed text-texto">{item.body}</p>}
                    <div className="mt-1 flex flex-wrap gap-x-3 text-[9px] text-cinza">
                      {item.productName && <span>Produto: {item.productName}</span>}
                      {item.orderNumber && <span>Pedido #{item.orderNumber}</span>}
                      {item.createdByName && <span>Por {item.createdByName}</span>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-rosa/15 bg-white shadow-sm">
            <div className="border-b border-rosa/10 px-4 py-3"><h2 className="text-sm font-extrabold text-texto">Histórico de pedidos</h2></div>
            {customer.orders.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-cinza">Ainda não há pedidos vinculados.</p>
            ) : (
              <div className="divide-y divide-rosa/10">
                {customer.orders.slice(0, 20).map((order) => (
                  <article key={order.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/admin/pedidos/${order.id}`} className="text-xs font-extrabold text-rosa-profundo">Pedido #{order.number}</Link>
                        <p className="mt-1 text-[10px] text-cinza">{formatCrmDateTime(order.createdAt)} · {order.status}</p>
                      </div>
                      <span className="text-sm font-extrabold text-texto">{money(order.total)}</span>
                    </div>
                    <div className="mt-2 space-y-1">{order.items.map((item) => <p key={item.id} className="text-[10px] text-cinza">{item.qty}× {item.name}{item.variantName ? ` · ${item.variantName}` : ""}</p>)}</div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-rosa/15 bg-white p-3 shadow-sm sm:p-4"><p className="text-[8px] font-bold uppercase tracking-wide text-cinza sm:text-[9px]">{label}</p><p className="mt-1 text-sm font-extrabold text-texto sm:text-base">{value}</p></div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3"><dt className="text-cinza">{label}</dt><dd className="max-w-[62%] text-right font-bold text-texto">{value}</dd></div>;
}
