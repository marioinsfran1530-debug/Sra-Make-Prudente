import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { moveLeadAction } from "../actions";

const stages = [
  ["NOVO", "Novo"],
  ["ATENDIMENTO", "Atendimento"],
  ["PRODUTO_INDICADO", "Produto indicado"],
  ["AGUARDANDO_PAGAMENTO", "Aguardando pagamento"],
  ["VENDIDO", "Vendido"],
  ["PERDIDO", "Perdido"],
  ["POS_VENDA", "Pós-venda"],
  ["RECOMPRA", "Recompra"],
] as const;

type LeadRow = {
  id: string;
  customerId: string;
  stage: string;
  estimatedValue: { toString(): string } | null;
  source: string | null;
  notes: string | null;
  updatedAt: Date;
  customerName: string;
  customerPhone: string;
  productName: string | null;
};

function money(value: unknown) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

export default async function FunilPage() {
  const leads = await prisma.$queryRaw<LeadRow[]>`
    SELECT l."id", l."customerId", l."stage"::text AS "stage", l."estimatedValue", l."source", l."notes", l."updatedAt",
           c."name" AS "customerName", c."phone" AS "customerPhone", p."name" AS "productName"
    FROM "CrmLead" l
    JOIN "Customer" c ON c."id" = l."customerId"
    LEFT JOIN "Product" p ON p."id" = l."productId"
    ORDER BY l."updatedAt" DESC
    LIMIT 500
  `;

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/crm" className="text-[11px] font-bold text-rosa-profundo">← CRM</Link>
          <h1 className="mt-1 font-serif text-2xl font-bold text-texto">Funil comercial</h1>
          <p className="mt-1 text-xs text-cinza">Cada oportunidade acompanha o contato desde a primeira conversa até venda, perda ou recompra.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/crm/follow-ups" className="rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo">Follow-ups</Link>
          <Link href="/admin/crm/novo" className="rounded-xl bg-rosa-profundo px-4 py-2.5 text-xs font-extrabold text-white">+ Novo contato</Link>
        </div>
      </div>

      <div className="overflow-x-auto pb-3">
        <div className="flex min-w-max gap-3">
          {stages.map(([key, label]) => {
            const rows = leads.filter((lead) => lead.stage === key);
            return (
              <section key={key} className="w-[280px] shrink-0 rounded-2xl border border-rosa/15 bg-white/70 p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-xs font-extrabold text-texto">{label}</h2>
                  <span className="rounded-full bg-creme px-2 py-1 text-[10px] font-bold text-cinza">{rows.length}</span>
                </div>
                <div className="space-y-2.5">
                  {rows.length === 0 && <p className="rounded-xl border border-dashed border-rosa/15 p-4 text-center text-[10px] text-cinza">Nenhuma oportunidade</p>}
                  {rows.map((lead) => (
                    <article key={lead.id} className="rounded-xl border border-rosa/10 bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-extrabold text-texto">{lead.customerName}</p>
                          <p className="mt-0.5 truncate text-[9px] text-cinza">{lead.productName || "Interesse ainda não definido"}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-extrabold text-rosa-profundo">{money(lead.estimatedValue)}</span>
                      </div>
                      {lead.notes && <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-cinza">{lead.notes}</p>}
                      <div className="mt-3 flex gap-1.5">
                        <Link href={`/admin/crm/${encodeURIComponent(lead.customerPhone)}`} className="flex-1 rounded-lg bg-creme px-2 py-2 text-center text-[9px] font-extrabold text-texto">Cliente</Link>
                        <form action={moveLeadAction} className="flex-1">
                          <input type="hidden" name="id" value={lead.id} />
                          <select name="stage" defaultValue={lead.stage} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="w-full rounded-lg border border-rosa/15 bg-white px-1.5 py-2 text-[9px] font-bold text-cinza">
                            {stages.map(([stage, stageLabel]) => <option key={stage} value={stage}>{stageLabel}</option>)}
                          </select>
                        </form>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
