import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createLeadAction } from "../actions";
import ProductPicker from "../atendimento/ProductPicker";

export default async function NovoLeadPage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ stockQty: "desc" }, { brand: "asc" }, { name: "asc" }],
    select: { id: true, name: true, brand: true, price: true, promoPrice: true, stockQty: true },
    take: 1000,
  });

  const productOptions = products.map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand,
    price: Number(product.promoPrice ?? product.price),
    stockQty: product.stockQty,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <Link href="/admin/crm" className="text-[11px] font-bold text-rosa-profundo">← CRM</Link>
        <h1 className="mt-2 font-serif text-2xl font-bold text-texto">Novo contato comercial</h1>
        <p className="mt-1 text-xs leading-relaxed text-cinza">Cadastre quem chamou no WhatsApp, mesmo que ainda não tenha comprado.</p>
      </div>

      <form action={createLeadAction} className="space-y-4 rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" name="name" required placeholder="Nome da cliente" />
          <Field label="WhatsApp" name="phone" required inputMode="tel" placeholder="(18) 99999-9999" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-texto">
            Origem
            <select name="source" defaultValue="WHATSAPP" className="mt-1 w-full rounded-xl border border-rosa/20 bg-white px-3 py-3 text-base font-normal outline-none sm:text-sm">
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

        <ProductPicker
          products={productOptions}
          label="Produto de interesse"
          emptyLabel="Opcional: deixe sem selecionar quando a cliente ainda não definiu o produto."
        />

        <label className="block text-xs font-bold text-texto">
          Observações
          <textarea name="notes" rows={4} maxLength={1000} placeholder="Ex.: procura corretivo para olheiras, quer retirar hoje..." className="mt-1 w-full resize-y rounded-xl border border-rosa/20 px-3 py-3 text-base font-normal outline-none focus:border-rosa-profundo sm:text-sm" />
        </label>

        <div className="grid gap-2 pt-2 sm:flex sm:justify-end">
          <Link href="/admin/crm" className="order-2 rounded-xl border border-rosa/20 px-4 py-3 text-center text-xs font-bold text-cinza sm:order-1">Cancelar</Link>
          <button type="submit" className="order-1 rounded-xl bg-rosa-profundo px-5 py-3 text-xs font-extrabold text-white sm:order-2">Criar oportunidade</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, required, placeholder, inputMode }: { label: string; name: string; required?: boolean; placeholder?: string; inputMode?: "tel" | "decimal" }) {
  return (
    <label className="text-xs font-bold text-texto">
      {label}
      <input name={name} required={required} inputMode={inputMode} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-rosa/20 px-3 py-3 text-base font-normal outline-none focus:border-rosa-profundo sm:text-sm" />
    </label>
  );
}
