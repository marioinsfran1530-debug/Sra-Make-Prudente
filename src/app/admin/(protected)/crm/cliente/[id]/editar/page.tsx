import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPhone } from "@/lib/crm";
import { updateCustomerAction } from "../../../customer-actions";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { id: true, name: true, phone: true, source: true },
  });
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <Link href={`/admin/crm/cliente/${encodeURIComponent(customer.id)}`} className="text-[11px] font-bold text-rosa-profundo">← Voltar para a ficha</Link>

      <div className="mt-3 rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-cinza">Cadastro do cliente</p>
        <h1 className="mt-1 font-serif text-2xl font-bold text-texto">Editar cliente</h1>
        <p className="mt-1 text-xs leading-5 text-cinza">Corrija nome, WhatsApp ou origem. O histórico de pedidos permanece preservado.</p>

        <form action={updateCustomerAction} className="mt-5 space-y-4">
          <input type="hidden" name="id" value={customer.id} />

          <label className="block text-xs font-bold text-texto">
            Nome
            <input name="name" required defaultValue={customer.name} maxLength={120} className="mt-1 w-full rounded-xl border border-rosa/20 bg-white px-3 py-3 text-sm outline-none focus:border-rosa-profundo" />
          </label>

          <label className="block text-xs font-bold text-texto">
            Telefone / WhatsApp
            <input name="phone" required inputMode="tel" defaultValue={formatPhone(customer.phone)} placeholder="(18) 99999-9999" className="mt-1 w-full rounded-xl border border-rosa/20 bg-white px-3 py-3 text-sm outline-none focus:border-rosa-profundo" />
            <span className="mt-1 block text-[10px] font-normal leading-4 text-cinza">O sistema preserva exatamente os dígitos informados. Não acrescenta o nono dígito automaticamente.</span>
          </label>

          <label className="block text-xs font-bold text-texto">
            Origem
            <select name="source" defaultValue={customer.source || "outro"} className="mt-1 w-full rounded-xl border border-rosa/20 bg-white px-3 py-3 text-sm outline-none focus:border-rosa-profundo">
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="google">Google</option>
              <option value="catalogo">Catálogo</option>
              <option value="tiktok">TikTok</option>
              <option value="indicacao">Indicação</option>
              <option value="loja_fisica">Loja física</option>
              <option value="manual">Manual</option>
              <option value="outro">Outro</option>
            </select>
          </label>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-4 text-amber-800">
            Se o telefone já estiver cadastrado em outro cliente, o sistema bloqueia a alteração para evitar uma nova duplicidade.
          </div>

          <button className="w-full rounded-xl bg-rosa-profundo px-4 py-3 text-xs font-extrabold text-white">Salvar alterações</button>
        </form>
      </div>
    </div>
  );
}
