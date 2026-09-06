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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/crm" className="text-[11px] font-bold text-rosa-profundo">← CRM</Link>
          <h1 className="mt-1 font-serif text-2xl font-bold text-texto">Funil comercial</h1>
          <p className="mt-1 text-xs leading-relaxed text-cinza">Acompanhe cada oportunidade até venda, perda, pós-venda ou recompra. No celular, deslize as colunas para o lado.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link href="/admin/crm/follow-ups" className="rounded-xl border border-rosa/20 bg-white px-4 py-3 text-center text-xs font-bold text-rosa-profundo">Follow-ups</Link>
          <Link href="/admin/crm/novo" className="rounded-xl bg-rosa-profundo px-4 py-3 text-center text-xs font-extrabold text-white">+ Novo contato</Link>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-3 snap-x snap-mandatory overscroll-x-contain">
        <div className="flex min-w-max gap-3">
          {stages.map(([key, label]) => {
            const rows = leads.filter((lead) => lead.stage === key);
            return (
              <section key={key} className="w-[84vw] max-w-[320px] shrink-0 snap-start rounded-2xl border border-rosa/15 bg-white/70 p-3 shadow-sm sm:w-[300px]">
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
                          <p className="truncate text-sm font-extrabold text-texto">{lead.customerName}</p>
                          <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-cinza">{lead.productName || "Interesse ainda não definido"}</p>
                        </div>
                        <span className="shrink-0 text-[11px] font-extrabold text-rosa-profundo">{money(lead.estimatedValue)}</span>
                      </div>
                      {lead.notes && <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-cinza">{lead.notes}</p>}
                      <div className="mt-3 space-y-2">
                        <Link href={`/admin/crm/${encodeURIComponent(lead.customerPhone)}`} className="block rounded-lg bg-creme px-2 py-2.5 text-center text-[10px] font-extrabold text-texto">Abrir cliente</Link>
                        <form action={moveLeadAction} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                          <input type="hidden" name="id" value={lead.id} />
                          <select name="stage" defaultValue={lead.stage} className="min-w-0 rounded-lg border border-rosa/15 bg-white px-2 py-2.5 text-base font-bold text-cinza sm:text-xs">
                            {stages.map(([stage, stageLabel]) => <option key={stage} value={stage}>{stageLabel}</option>)}
                          </select>
                          <button className="rounded-lg bg-rosa-profundo px-3 py-2.5 text-[10px] font-extrabold text-white">Mover</button>
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
