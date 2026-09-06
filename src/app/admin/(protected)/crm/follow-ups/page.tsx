import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { completeFollowUpAction } from "../actions";

export const dynamic = "force-dynamic";

type FollowUpRow = {
  id: string;
  dueAt: Date;
  reason: string;
  status: string;
  customerName: string;
  customerPhone: string;
  leadStage: string | null;
};

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(value);
}

export default async function FollowUpsPage() {
  const rows = await prisma.$queryRaw<FollowUpRow[]>`
    SELECT f."id", f."dueAt", f."reason", f."status"::text AS "status",
           c."name" AS "customerName", c."phone" AS "customerPhone",
           l."stage"::text AS "leadStage"
    FROM "CrmFollowUp" f
    JOIN "Customer" c ON c."id" = f."customerId"
    LEFT JOIN "CrmLead" l ON l."id" = f."leadId"
    WHERE f."status" = 'PENDENTE'::"crm_follow_up_status"
    ORDER BY f."dueAt" ASC
    LIMIT 500
  `;

  const now = new Date();
  const overdue = rows.filter((row) => row.dueAt < now);
  const upcoming = rows.filter((row) => row.dueAt >= now);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/crm" className="text-[11px] font-bold text-rosa-profundo">← CRM</Link>
          <h1 className="mt-1 font-serif text-2xl font-bold text-texto">Agenda de follow-up</h1>
          <p className="mt-1 text-xs text-cinza">Contatos que precisam de retorno para não deixar oportunidades esfriarem.</p>
        </div>
        <Link href="/admin/crm/funil" className="rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo">Ver funil</Link>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Pendentes" value={String(rows.length)} />
        <Metric label="Atrasados" value={String(overdue.length)} emphasis={overdue.length > 0} />
        <Metric label="Próximos" value={String(upcoming.length)} />
      </section>

      <div className="mt-5 space-y-5">
        <Group title="Atrasados" rows={overdue} empty="Nenhum follow-up atrasado." />
        <Group title="Próximos" rows={upcoming} empty="Nenhum follow-up agendado." />
      </div>
    </div>
  );
}

function Group({ title, rows, empty }: { title: string; rows: FollowUpRow[]; empty: string }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-rosa/15 bg-white shadow-sm">
      <div className="border-b border-rosa/10 px-4 py-3"><h2 className="text-sm font-extrabold text-texto">{title}</h2></div>
      {rows.length === 0 ? <p className="p-5 text-xs text-cinza">{empty}</p> : (
        <div className="divide-y divide-rosa/10">
          {rows.map((row) => (
            <article key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/crm/${encodeURIComponent(row.customerPhone)}`} className="text-xs font-extrabold text-rosa-profundo">{row.customerName}</Link>
                  {row.leadStage && <span className="rounded-full bg-creme px-2 py-1 text-[9px] font-bold text-cinza">{row.leadStage.replaceAll("_", " ")}</span>}
                </div>
                <p className="mt-1 text-xs text-texto">{row.reason}</p>
                <p className="mt-1 text-[10px] font-bold text-cinza">{dateTime(row.dueAt)}</p>
              </div>
              <form action={completeFollowUpAction}>
                <input type="hidden" name="id" value={row.id} />
                <button className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[10px] font-extrabold text-white">Marcar como feito</button>
              </form>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return <div className={`rounded-2xl border p-4 shadow-sm ${emphasis ? "border-amber-200 bg-amber-50" : "border-rosa/15 bg-white"}`}><p className="text-[9px] font-bold uppercase tracking-wide text-cinza">{label}</p><p className="mt-1 text-xl font-extrabold text-texto">{value}</p></div>;
}
