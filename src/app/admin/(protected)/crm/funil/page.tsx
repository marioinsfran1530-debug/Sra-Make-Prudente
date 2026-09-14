import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CrmPipelineBoard } from "./CrmPipelineBoard";

export const dynamic = "force-dynamic";

type LeadRow = {
  id: string;
  stage: string;
  estimatedValue: { toString(): string } | null;
  source: string | null;
  notes: string | null;
  lostReason: string | null;
  updatedAt: Date;
  customerName: string;
  customerPhone: string;
  productName: string | null;
};

export default async function FunilPage() {
  const leads = await prisma.$queryRaw<LeadRow[]>`
    SELECT l."id", l."stage"::text AS "stage", l."estimatedValue", l."source", l."notes", l."lostReason", l."updatedAt",
           c."name" AS "customerName", c."phone" AS "customerPhone", p."name" AS "productName"
    FROM "CrmLead" l
    JOIN "Customer" c ON c."id" = l."customerId"
    LEFT JOIN "Product" p ON p."id" = l."productId"
    ORDER BY l."updatedAt" DESC
    LIMIT 500
  `;

  const serialized = leads.map((lead) => ({
    id: lead.id,
    stage: lead.stage,
    estimatedValue: lead.estimatedValue == null ? null : Number(lead.estimatedValue),
    source: lead.source,
    notes: lead.notes,
    lostReason: lead.lostReason,
    updatedAt: lead.updatedAt.toISOString(),
    customerName: lead.customerName,
    customerPhone: lead.customerPhone,
    productName: lead.productName,
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/crm" className="text-[11px] font-bold text-rosa-profundo">← CRM</Link>
          <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-rosa-profundo">Pipeline comercial</p>
          <h1 className="mt-1 font-serif text-2xl font-bold text-texto">Funil comercial</h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-cinza">
            Veja primeiro o que precisa de ação. Vendas concluídas, perdas e pós-venda ficam separados para o funil não virar uma sequência longa de colunas.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link href="/admin/crm/follow-ups" className="rounded-xl border border-rosa/20 bg-white px-4 py-3 text-center text-xs font-bold text-rosa-profundo">Follow-ups</Link>
          <Link href="/admin/crm/novo" className="rounded-xl bg-rosa-profundo px-4 py-3 text-center text-xs font-extrabold text-white">+ Novo contato</Link>
        </div>
      </div>

      <CrmPipelineBoard leads={serialized} />
    </div>
  );
}
