import { prisma } from "@/lib/prisma";
import { PromotionCenter } from "@/components/admin/PromotionCenter";

export default async function AdminDivulgacaoPage() {
  const [products, settings] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: true,
        images: { orderBy: { order: "asc" }, take: 1 },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    }),
    prisma.storeSettings.findFirst(),
  ]);

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
    imageUrl: product.images[0]?.url ?? null,
    category: { name: product.category.name },
  }));

  const branding = {
    storeName: settings?.storeName || "Sra Make Prudente",
    logoUrl: settings?.logoUrl ?? null,
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-serif text-xl font-bold text-texto">Central de Divulgação</h1>
        <p className="mt-1 text-sm text-cinza">
          Gere mensagens, artes e a fila do dia usando os dados do catálogo.
        </p>
      </div>

      <PromotionCenter products={rows} branding={branding} />
    </div>
  );
}
