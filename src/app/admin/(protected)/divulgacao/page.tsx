import { prisma } from "@/lib/prisma";
import { PromotionCenter } from "@/components/admin/PromotionCenter";

export default async function AdminDivulgacaoPage() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });

  const rows = products.map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand,
    price: Number(product.price),
    promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
    stockQty: product.stockQty,
    active: product.active,
    featured: product.featured,
    isNew: product.isNew,
    bestSeller: product.bestSeller,
    createdAt: product.createdAt.toISOString(),
    category: { name: product.category.name },
  }));

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-serif text-xl font-bold text-texto">Central de Divulgação</h1>
        <p className="mt-1 text-sm text-cinza">
          Gere ofertas, organize a fila do dia e publique com confirmação humana.
        </p>
      </div>

      <PromotionCenter products={rows} />
    </div>
  );
}
