import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { todayIso } from "@/lib/finance";
import { StockEntryForm, type EntryProduct } from "@/components/admin/StockEntryForm";

export const dynamic = "force-dynamic";

export default async function NewStockEntryPage() {
  // Também entram os produtos inativos (rascunhos criados por uma entrada anterior,
  // ou fora de linha): dá para receber mercadoria deles; ficam marcados na busca.
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        brand: true,
        sku: true,
        active: true,
        stockQty: true,
        costPrice: true,
        variants: {
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, sku: true, stockQty: true },
        },
      },
    }),
    prisma.category.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const serialized: EntryProduct[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand,
    sku: product.sku,
    active: product.active,
    stockQty: product.stockQty,
    costPrice: product.costPrice === null ? null : Number(product.costPrice),
    variants: product.variants,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rosa-profundo sm:text-xs">Estoque</p>
          <h1 className="font-serif text-xl font-bold leading-tight text-texto sm:text-2xl">Nova entrada de estoque</h1>
          <p className="mt-1 hidden text-sm text-cinza sm:block">
            Informe o que chegou, a quantidade e quanto pagou em cada item. O estoque e o custo são atualizados ao registrar.
          </p>
        </div>
        <Link
          href="/admin/produtos/entradas"
          className="shrink-0 rounded-xl border border-rosa/20 bg-white px-3 py-2 text-[11px] font-bold text-rosa-profundo sm:text-xs"
        >
          Ver entradas
        </Link>
      </div>

      <StockEntryForm products={serialized} categories={categories} today={todayIso()} />
    </div>
  );
}
