import { prisma } from "@/lib/prisma";
import { PromotionCenterV4 } from "@/components/admin/PromotionCenterV4";

const SITE_URL = "https://sramakeprudente.com.br";

export default async function AdminDivulgacaoPage() {
  const [products, settings] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: true,
        images: { orderBy: { order: "asc" } },
        variants: { select: { active: true, stockQty: true } },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    }),
    prisma.storeSettings.findFirst(),
  ]);
  const rows = products.map((product) => {
    const stockQty = product.variants.length ? product.variants.filter((variant) => variant.active).reduce((total, variant) => total + variant.stockQty, 0) : product.stockQty;
    const images = product.images.map((image) => ({ id: image.id, url: image.url }));
    return { id: product.id, name: product.name, brand: product.brand, price: Number(product.price), promoPrice: product.promoPrice ? Number(product.promoPrice) : null, stockQty, active: product.active, featured: product.featured, isNew: product.isNew, bestSeller: product.bestSeller, createdAt: product.createdAt.toISOString(), imageUrl: images[0]?.url ?? null, images, category: { name: product.category.name } };
  });
  const branding = { storeName: settings?.storeName || "Sra Make Prudente", logoUrl: settings?.logoUrl ?? null };
  return <div><div className="mb-5"><h1 className="font-serif text-xl font-bold text-texto">Central de Divulgação</h1><p className="mt-1 text-sm text-cinza">Templates comerciais profissionais para divulgar produto, preço e oferta com clareza.</p></div><PromotionCenterV4 products={rows} branding={branding} siteUrl={SITE_URL} /></div>;
}
