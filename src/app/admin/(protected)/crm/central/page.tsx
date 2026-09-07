import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { whatsappUrl } from "@/lib/crm";
import { formatCrmDateTime } from "@/lib/crm-time";

export const dynamic = "force-dynamic";

type CentralRow = {
  leadId: string;
  customerId: string;
  customerName: string;
  phone: string;
  stage: string;
  productName: string | null;
  estimatedValue: unknown;
  source: string | null;
  campaign: string | null;
  campaignContent: string | null;
  campaignCode: string | null;
  updatedAt: Date;
  nextFollowUp: Date | null;
  tags: string | null;
};

const stageLabels: Record<string, string> = {
  NOVO: "Novo",
  ATENDIMENTO: "Em atendimento",
  PRODUTO_INDICADO: "Produto indicado",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  POS_VENDA: "Pós-venda",
  RECOMPRA: "Recompra",
};

function money(value: unknown) {
  if (value == null) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
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

export default async function CentralAtendimentoPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const q = (params?.q || "").trim().toLowerCase();

  const rows = await prisma.$queryRaw<CentralRow[]>`
    SELECT
      l."id" AS "leadId",
      c."id" AS "customerId",
      c."name" AS "customerName",
      c."phone",
      l."stage"::text AS "stage",
      p."name" AS "productName",
      l."estimatedValue",
      l."source",
      l."campaign",
      l."campaignContent",
      l."campaignCode",
      l."updatedAt",
      (
        SELECT f."dueAt"
        FROM "CrmFollowUp" f
        WHERE f."leadId" = l."id" AND f."status" = 'PENDENTE'::"crm_follow_up_status"
        ORDER BY f."dueAt" ASC
        LIMIT 1
      ) AS "nextFollowUp",
      (
        SELECT string_agg(t."name" || '|' || COALESCE(t."color", ''), ';;' ORDER BY t."name")
        FROM "CustomerTag" ct
        JOIN "CrmTag" t ON t."id" = ct."tagId"
        WHERE ct."customerId" = c."id" AND t."active" = TRUE
      ) AS "tags"
    FROM "CrmLead" l
    JOIN "Customer" c ON c."id" = l."customerId"
    LEFT JOIN "Product" p ON p."id" = l."productId"
    WHERE l."stage" NOT IN ('VENDIDO'::"crm_lead_stage", 'PERDIDO'::"crm_lead_stage")
    ORDER BY
      CASE l."stage"
        WHEN 'AGUARDANDO_PAGAMENTO'::"crm_lead_stage" THEN 1
        WHEN 'PRODUTO_INDICADO'::"crm_lead_stage" THEN 2
        WHEN 'ATENDIMENTO'::"crm_lead_stage" THEN 3
        WHEN 'NOVO'::"crm_lead_stage" THEN 4
        ELSE 5
      END,
      l."updatedAt" ASC
    LIMIT 500
  `;

  const filtered = rows.filter((row) => {
    if (!q) return true;
    return [row.customerName, row.phone, row.productName, row.source, row.campaign, row.campaignCode]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  const awaiting = rows.filter((row) => row.stage === "AGUARDANDO_PAGAMENTO").length;
  const newCount = rows.filter((row) => row.stage === "NOVO").length;
  const withFollowUp = rows.filter((row) => row.nextFollowUp).length;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-rosa-profundo">CRM Sra Make</p>
          <h1 className="font-serif text-2xl font-bold text-texto">Central de atendimento</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-cinza">Fila comercial de contatos em andamento. Abra a ficha, indique produtos, acompanhe a etapa e defina a próxima ação.</p>
        </div>
        <Link href="/admin/crm/atendimento" className="rounded-xl bg-emerald-600 px-5 py-3 text-center text-xs font-extrabold text-white">+ Novo atendimento</Link>
      </div>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Metric label="Em aberto" value={String(rows.length)} />
        <Metric label="Novos" value={String(newCount)} />
        <Metric label="Aguard. pagamento" value={String(awaiting)} attention={awaiting > 0} />
        <Metric label="Com próxima ação" value={String(withFollowUp)} />
      </section>

      <form method="get" className="flex gap-2 rounded-2xl border border-rosa/15 bg-white p-3 shadow-sm">
        <input name="q" defaultValue={params?.q || ""} placeholder="Buscar cliente, produto, campanha ou WhatsApp" className="min-w-0 flex-1 rounded-xl border border-rosa/20 bg-creme/20 px-3 py-3 text-base outline-none focus:border-rosa-profundo sm:text-sm" />
        <button className="rounded-xl border border-rosa/20 px-4 py-3 text-xs font-extrabold text-rosa-profundo">Buscar</button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-rosa/15 bg-white shadow-sm">
        <div className="border-b border-rosa/10 px-4 py-3">
          <p className="text-xs font-extrabold text-texto">{filtered.length} atendimento{filtered.length === 1 ? "" : "s"}</p>
        </div>
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-extrabold text-texto">Nenhum atendimento encontrado</p>
            <p className="mt-1 text-xs text-cinza">Crie um novo contato ou altere a busca.</p>
          </div>
        ) : (
          <div className="divide-y divide-rosa/10">
            {filtered.map((row) => {
              const tags = (row.tags || "").split(";;").filter(Boolean).map((item) => {
                const [name, color] = item.split("|");
                return { name, color };
              });
              const firstName = row.customerName.split(" ")[0];
              const message = row.productName
                ? `Olá, ${firstName}! Aqui é da Sra Make Prudente. Passando para continuar nosso atendimento sobre ${row.productName}.`
                : `Olá, ${firstName}! Aqui é da Sra Make Prudente. Passando para dar continuidade ao nosso atendimento.`;
              return (
                <article key={row.leadId} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/crm/cliente/${encodeURIComponent(row.customerId)}`} className="truncate text-sm font-extrabold text-texto hover:text-rosa-profundo">{row.customerName}</Link>
                      <span className="rounded-full bg-creme px-2 py-1 text-[9px] font-extrabold text-rosa-profundo">{stageLabels[row.stage] || row.stage}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-cinza">{row.productName || "Interesse ainda não definido"}{money(row.estimatedValue) ? ` · ${money(row.estimatedValue)}` : ""}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tags.slice(0, 5).map((tag) => <span key={tag.name} className={`rounded-full px-2 py-1 text-[9px] font-bold ${tagTone(tag.color)}`}>{tag.name}</span>)}
                    </div>
                  </div>

                  <div className="text-[10px] leading-relaxed text-cinza">
                    <p><strong className="text-texto">Origem:</strong> {row.source || "não informada"}</p>
                    {row.campaign && <p><strong className="text-texto">Campanha:</strong> {row.campaign}</p>}
                    {row.campaignCode && <p><strong className="text-texto">Código:</strong> {row.campaignCode}</p>}
                    <p><strong className="text-texto">Atualizado:</strong> {formatCrmDateTime(row.updatedAt)}</p>
                    {row.nextFollowUp && <p className="font-bold text-amber-800">Próxima ação: {formatCrmDateTime(row.nextFollowUp)}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-col">
                    <a href={whatsappUrl(row.phone, message)} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-emerald-600 px-4 py-3 text-center text-[11px] font-extrabold text-white">WhatsApp</a>
                    <Link href={`/admin/crm/cliente/${encodeURIComponent(row.customerId)}`} className="rounded-xl border border-rosa/20 px-4 py-3 text-center text-[11px] font-extrabold text-rosa-profundo">Abrir ficha</Link>
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
  return <div className={`rounded-2xl border p-3 shadow-sm sm:p-4 ${attention ? "border-amber-200 bg-amber-50" : "border-rosa/15 bg-white"}`}><p className="text-[8px] font-bold uppercase tracking-wide text-cinza sm:text-[9px]">{label}</p><p className="mt-1 text-lg font-extrabold text-texto">{value}</p></div>;
}
