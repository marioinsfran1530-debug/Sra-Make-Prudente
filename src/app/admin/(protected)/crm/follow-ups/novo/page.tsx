import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createFollowUpAction } from "../../actions";

export default async function NovoFollowUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ customerId?: string; leadId?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const [customers, leads] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, phone: true }, take: 1000 }),
    prisma.crmLead.findMany({
      where: { stage: { notIn: ["VENDIDO", "PERDIDO"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, stage: true, customerId: true, product: { select: { name: true } } },
      take: 500,
    }),
  ]);

  const defaultCustomerId = params?.customerId || leads.find((lead) => lead.id === params?.leadId)?.customerId || "";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <Link href="/admin/crm/follow-ups" className="text-[11px] font-bold text-rosa-profundo">← Follow-ups</Link>
        <h1 className="mt-2 font-serif text-2xl font-bold text-texto">Agendar retorno</h1>
        <p className="mt-1 text-xs text-cinza">Crie uma tarefa para lembrar a equipe de chamar a cliente novamente.</p>
      </div>

      <form action={createFollowUpAction} className="space-y-4 rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
        <label className="block text-xs font-bold text-texto">
          Cliente
          <select name="customerId" required defaultValue={defaultCustomerId} className="mt-1 w-full rounded-xl border border-rosa/20 bg-white px-3 py-2.5 text-sm font-normal outline-none">
            <option value="" disabled>Selecione a cliente</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} — {customer.phone}</option>)}
          </select>
        </label>

        <label className="block text-xs font-bold text-texto">
          Oportunidade relacionada
          <select name="leadId" defaultValue={params?.leadId || ""} className="mt-1 w-full rounded-xl border border-rosa/20 bg-white px-3 py-2.5 text-sm font-normal outline-none">
            <option value="">Sem oportunidade específica</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>{lead.stage.replaceAll("_", " ")} — {lead.product?.name || "sem produto"}</option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-bold text-texto">
          Quando retornar
          <input type="datetime-local" name="dueAt" required className="mt-1 w-full rounded-xl border border-rosa/20 px-3 py-2.5 text-sm font-normal outline-none" />
        </label>

        <label className="block text-xs font-bold text-texto">
          Motivo
          <textarea name="reason" required rows={3} maxLength={500} placeholder="Ex.: confirmar se decidiu o tom do corretivo; avisar quando o produto chegar..." className="mt-1 w-full resize-y rounded-xl border border-rosa/20 px-3 py-2.5 text-sm font-normal outline-none" />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Link href="/admin/crm/follow-ups" className="rounded-xl border border-rosa/20 px-4 py-2.5 text-xs font-bold text-cinza">Cancelar</Link>
          <button className="rounded-xl bg-rosa-profundo px-5 py-2.5 text-xs font-extrabold text-white">Agendar follow-up</button>
        </div>
      </form>
    </div>
  );
}
