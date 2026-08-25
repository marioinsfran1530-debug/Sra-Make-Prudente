import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductDescriptionQueue } from "@/components/admin/ProductDescriptionQueue";

export const dynamic = "force-dynamic";

export default async function ProductDescriptionsPage() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [products, viewGroups] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        brand: true,
        description: true,
        category: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["productId"],
      where: {
        event: "product_view",
        productId: { not: null },
        createdAt: { gte: since },
      },
      _count: { _all: true },
    }),
  ]);

  const views = new Map(
    viewGroups
      .filter((item): item is typeof item & { productId: string } => Boolean(item.productId))
      .map((item) => [item.productId, item._count._all])
  );

  const queue = products
    .filter((product) => (product.description?.trim().length ?? 0) < 50)
    .map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      categoryName: product.category.name,
      description: product.description ?? "",
      views30d: views.get(product.id) ?? 0,
    }))
    .sort((a, b) => {
      if (b.views30d !== a.views30d) return b.views30d - a.views30d;
      const aMissing = a.description.trim().length === 0 ? 1 : 0;
      const bMissing = b.description.trim().length === 0 ? 1 : 0;
      if (bMissing !== aMissing) return bMissing - aMissing;
      return a.name.localeCompare(b.name, "pt-BR");
    });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Análise · Qualidade</p>
          <h1 className="font-serif text-2xl font-bold text-texto">Fila de descrições</h1>
          <p className="mt-1 max-w-3xl text-sm text-cinza">
            Corrija primeiro os produtos mais vistos nos últimos 30 dias. Sem amostra suficiente, a fila prioriza os cadastros sem descrição.
          </p>
        </div>
        <Link href="/admin/analise/qualidade" className="rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo">
          Voltar para qualidade
        </Link>
      </div>

      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
        A fila não cria texto automaticamente. Use somente características confirmadas do produto; assim mantemos SEO e catálogo sem informações inventadas.
      </div>

      <ProductDescriptionQueue products={queue} />
    </div>
  );
}
