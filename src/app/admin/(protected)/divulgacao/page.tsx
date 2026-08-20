import { prisma } from "@/lib/prisma";
import { PromotionCenter } from "@/components/admin/PromotionCenter";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sramakeprudente.vercel.app";

export default async function AdminDivulgacaoPage() {
  const [products, settings] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: true,
        images: { orderBy: { order: "asc" }, take: 1 },
        variants: {
          where: { active: true },
          select: { stockQty: true },
        },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    }),
    prisma.storeSettings.findFirst(),
  ]);

  const rows = products.map((product) => {
    const stockQty = product.variants.length
      ? product.variants.reduce((total, variant) => total + variant.stockQty, 0)
      : product.stockQty;

    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: Number(product.price),
      promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
      stockQty,
      active: product.active,
      featured: product.featured,
      isNew: product.isNew,
      bestSeller: product.bestSeller,
      createdAt: product.createdAt.toISOString(),
      imageUrl: product.images[0]?.url ?? null,
      category: { name: product.category.name },
    };
  });

  const branding = {
    storeName: settings?.storeName || "Sra Make Prudente",
    logoUrl: settings?.logoUrl ?? null,
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-serif text-xl font-bold text-texto">
          Central de Divulgação
        </h1>
        <p className="mt-1 text-sm text-cinza">
          Escolha um produto e compartilhe a campanha pronta.
        </p>
      </div>

      <PromotionCenter products={rows} branding={branding} siteUrl={SITE_URL} />
    </div>
  );
}
