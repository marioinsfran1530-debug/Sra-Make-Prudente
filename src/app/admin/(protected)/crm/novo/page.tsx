import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createLeadAction } from "../actions";

export default async function NovoLeadPage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ brand: "asc" }, { name: "asc" }],
    select: { id: true, name: true, brand: true, price: true, promoPrice: true },
    take: 500,
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <Link href="/admin/crm" className="text-[11px] font-bold text-rosa-profundo">← CRM</Link>
        <h1 className="mt-2 font-serif text-2xl font-bold text-texto">Novo contato comercial</h1>
        <p className="mt-1 text-xs text-cinza">Cadastre quem chamou no WhatsApp, mesmo que ainda não tenha comprado.</p>
      </div>

      <form action={createLeadAction} className="space-y-4 rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" name="name" required placeholder="Nome da cliente" />
          <Field label="WhatsApp" name="phone" required inputMode="tel" placeholder="(18) 99999-9999" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-texto">
            Origem
            <select name="source" defaultValue="WHATSAPP" className="mt-1 w-full rounded-xl border border-rosa/20 bg-white px-3 py-2.5 text-sm font-normal outline-none">
              <option value="WHATSAPP">WhatsApp</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="GOOGLE">Google</option>
              <option value="CATALOGO">Catálogo</option>
              <option value="INDICACAO">Indicação</option>
              <option value="LOJA_FISICA">Loja física</option>
              <option value="OUTRO">Outro</option>
            </select>
          </label>
          <Field label="Valor estimado" name="estimatedValue" inputMode="decimal" placeholder="0,00" />
        </div>

        <label className="block text-xs font-bold text-texto">
          Produto de interesse
          <select name="productId" defaultValue="" className="mt-1 w-full rounded-xl border border-rosa/20 bg-white px-3 py-2.5 text-sm font-normal outline-none">
            <option value="">Ainda não definido</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.brand} — {product.name}</option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-bold text-texto">
          Observações
          <textarea name="notes" rows={4} maxLength={1000} placeholder="Ex.: procura corretivo para olheiras, quer retirar hoje..." className="mt-1 w-full resize-y rounded-xl border border-rosa/20 px-3 py-2.5 text-sm font-normal outline-none" />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Link href="/admin/crm" className="rounded-xl border border-rosa/20 px-4 py-2.5 text-xs font-bold text-cinza">Cancelar</Link>
          <button type="submit" className="rounded-xl bg-rosa-profundo px-5 py-2.5 text-xs font-extrabold text-white">Criar oportunidade</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, required, placeholder, inputMode }: { label: string; name: string; required?: boolean; placeholder?: string; inputMode?: "tel" | "decimal" }) {
  return (
    <label className="text-xs font-bold text-texto">
      {label}
      <input name={name} required={required} inputMode={inputMode} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-rosa/20 px-3 py-2.5 text-sm font-normal outline-none" />
    </label>
  );
}
