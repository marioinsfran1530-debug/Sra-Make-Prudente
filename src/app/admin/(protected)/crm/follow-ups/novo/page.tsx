import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createFollowUpAction } from "../../actions";
import FollowUpTargetPicker from "./FollowUpTargetPicker";

export default async function NovoFollowUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ customerId?: string; leadId?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const [customers, leads] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, phone: true },
      take: 2000,
    }),
    prisma.crmLead.findMany({
      where: { stage: { notIn: ["VENDIDO", "PERDIDO"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, stage: true, customerId: true, product: { select: { name: true } } },
      take: 1000,
    }),
  ]);

  const defaultCustomerId = params?.customerId || leads.find((lead) => lead.id === params?.leadId)?.customerId || "";
  const customerOptions = customers.map((customer) => ({ id: customer.id, name: customer.name, phone: customer.phone }));
  const leadOptions = leads.map((lead) => ({
    id: lead.id,
    customerId: lead.customerId,
    stage: lead.stage,
    productName: lead.product?.name || null,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <Link href="/admin/crm/follow-ups" className="text-[11px] font-bold text-rosa-profundo">← Follow-ups</Link>
        <h1 className="mt-2 font-serif text-2xl font-bold text-texto">Agendar retorno</h1>
        <p className="mt-1 text-xs leading-relaxed text-cinza">Escolha a cliente por busca e, quando houver, vincule o retorno a uma oportunidade aberta.</p>
      </div>

      <form action={createFollowUpAction} className="space-y-4 rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm sm:p-5">
        <FollowUpTargetPicker
          customers={customerOptions}
          leads={leadOptions}
          defaultCustomerId={defaultCustomerId}
          defaultLeadId={params?.leadId || ""}
        />

        <label className="block text-xs font-bold text-texto">
          Quando retornar
          <input type="datetime-local" name="dueAt" required className="mt-1 w-full rounded-xl border border-rosa/20 px-3 py-3 text-base font-normal outline-none focus:border-rosa-profundo sm:text-sm" />
        </label>

        <label className="block text-xs font-bold text-texto">
          Motivo
          <textarea name="reason" required rows={3} maxLength={500} placeholder="Ex.: confirmar se decidiu o tom do corretivo; avisar quando o produto chegar..." className="mt-1 w-full resize-y rounded-xl border border-rosa/20 px-3 py-3 text-base font-normal outline-none focus:border-rosa-profundo sm:text-sm" />
        </label>

        <div className="grid gap-2 pt-2 sm:flex sm:justify-end">
          <Link href="/admin/crm/follow-ups" className="order-2 rounded-xl border border-rosa/20 px-4 py-3 text-center text-xs font-bold text-cinza sm:order-1">Cancelar</Link>
          <button className="order-1 rounded-xl bg-rosa-profundo px-5 py-3 text-xs font-extrabold text-white sm:order-2">Agendar follow-up</button>
        </div>
      </form>
    </div>
  );
}
