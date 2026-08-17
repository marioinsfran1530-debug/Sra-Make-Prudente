import { prisma } from "@/lib/prisma";
import { ProductsTable } from "@/components/admin/ProductsTable";

export default async function AdminProdutosPage() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    sku: p.sku,
    price: Number(p.price),
    promoPrice: p.promoPrice ? Number(p.promoPrice) : null,
    stockQty: p.stockQty,
    active: p.active,
    featured: p.featured,
    isNew: p.isNew,
    bestSeller: p.bestSeller,
    categoryId: p.categoryId,
    category: { name: p.category.name },
  }));

  return (
    <div>
      <h1 className="font-serif font-bold text-xl text-texto mb-4">Produtos</h1>
      <ProductsTable products={rows} />
    </div>
  );
}
