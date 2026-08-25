import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NovoProdutoPage() {
  const categories = await prisma.category.findMany({
    include: { subcategories: true },
    orderBy: { order: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Cadastro orientado</p>
          <h1 className="font-serif text-xl font-bold text-texto">Novo produto</h1>
        </div>
        <Link
          href="/admin/produtos/qualidade"
          className="text-xs font-bold text-rosa-profundo hover:underline"
        >
          Ver qualidade dos cadastros →
        </Link>
      </div>

      <section className="mb-5 rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-texto">Padrão mínimo para novos produtos</p>
            <p className="mt-1 text-xs leading-5 text-cinza">
              Esses dados alimentam Google, Merchant Center, busca interna e as análises do catálogo.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-700">
            Qualidade na origem
          </span>
        </div>

        <div className="mt-4 grid gap-2 text-xs text-cinza sm:grid-cols-2">
          <p><strong className="text-texto">Nome:</strong> produto + característica principal + marca quando fizer sentido.</p>
          <p><strong className="text-texto">Marca:</strong> use a marca real do produto.</p>
          <p><strong className="text-texto">Descrição:</strong> mínimo de 50 caracteres, com informação útil e verdadeira.</p>
          <p><strong className="text-texto">EAN/GTIN:</strong> informe quando existir; SKU interno continua opcional.</p>
          <p><strong className="text-texto">Imagem:</strong> foto limpa e nítida; a primeira será a principal.</p>
          <p><strong className="text-texto">Preço e estoque:</strong> confira antes de ativar o produto.</p>
        </div>

        <p className="mt-3 rounded-xl bg-creme/70 px-3 py-2 text-[11px] leading-5 text-cinza">
          Evite inventar benefícios, cor, tamanho ou características que não estejam confirmadas no produto ou na embalagem.
        </p>
      </section>

      <ProductForm categories={categories} />
    </div>
  );
}
