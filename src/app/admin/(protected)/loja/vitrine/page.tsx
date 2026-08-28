import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { HomeProductMerchandisingManager } from "@/components/admin/HomeProductMerchandisingManager";
import {
  getHomePopularitySignals,
  getHomeProductOrderSettings,
  rankPopularProducts,
} from "@/lib/home-merchandising";

export default async function AdminHomeMerchandisingPage() {
  const [products, orders, popularity] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        brand: true,
        price: true,
        promoPrice: true,
        stockQty: true,
        featured: true,
        isNew: true,
        bestSeller: true,
        images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
      },
    }),
    getHomeProductOrderSettings(),
    getHomePopularitySignals(),
  ]);

  const items = products.map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand,
    price: Number(product.price),
    promoPrice: product.promoPrice !== null ? Number(product.promoPrice) : null,
    stockQty: product.stockQty,
    imageUrl: product.images[0]?.url ?? null,
    featured: product.featured,
    isNew: product.isNew,
    bestSeller: product.bestSeller,
  }));

  const popularPreview = rankPopularProducts(items, popularity)
    .slice(0, 8)
    .map((product) => ({
      ...product,
      score: popularity.scores.get(product.id) ?? 0,
      source:
        popularity.enoughData && (popularity.scores.get(product.id) ?? 0) > 0
          ? ("CLIENTES" as const)
          : ("TAG" as const),
    }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/admin/loja" className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-rosa-profundo">
            <ChevronLeft size={14} /> Voltar para Loja
          </Link>
          <h1 className="font-serif text-xl font-bold text-texto">Organização da Home</h1>
          <p className="mt-1 text-xs leading-relaxed text-cinza">
            Controle a ordem das vitrines sem perder as tags cadastradas nos produtos.
          </p>
        </div>
        <Link href="/previa" target="_blank" className="inline-flex min-h-10 items-center rounded-xl border border-rosa/20 px-3 text-xs font-bold text-rosa-profundo">
          Ver prévia
        </Link>
      </div>

      <HomeProductMerchandisingManager
        products={items}
        featuredOrder={orders.homeFeaturedOrder}
        newOrder={orders.homeNewOrder}
        popularPreview={popularPreview}
        popularityEnoughData={popularity.enoughData}
        popularitySessions={popularity.uniqueSessions}
        popularitySignals={popularity.totalSignals}
      />
    </div>
  );
}
