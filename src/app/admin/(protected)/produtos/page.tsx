import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductsTable } from "@/components/admin/ProductsTable";

export default async function AdminProdutosPage() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      images: {
        orderBy: { order: "asc" },
        take: 1,
        select: { url: true },
      },
      variants: {
        where: { active: true },
        select: { stockQty: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = products.map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand,
    sku: product.sku,
    imageUrl: product.images[0]?.url ?? null,
    price: Number(product.price),
    promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
    stockQty: product.variants.length
      ? product.variants.reduce((total, variant) => total + variant.stockQty, 0)
      : product.stockQty,
    active: product.active,
    featured: product.featured,
    isNew: product.isNew,
    bestSeller: product.bestSeller,
    categoryId: product.categoryId,
    category: { name: product.category.name },
  }));

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif font-bold text-xl text-texto">Produtos</h1>
          <p className="mt-1 text-xs text-cinza">Cadastre, revise estoque e acompanhe a qualidade dos dados enviados ao catálogo.</p>
        </div>
        <Link
          href="/admin/produtos/qualidade"
          className="rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo"
        >
          Qualidade dos cadastros
        </Link>
      </div>
      <ProductsTable products={rows} />
    </div>
  );
}
