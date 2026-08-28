import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CounterSaleForm } from "@/components/admin/CounterSaleForm";

export const dynamic = "force-dynamic";

export default async function NewCounterSalePage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      brand: true,
      sku: true,
      price: true,
      promoPrice: true,
      stockQty: true,
      category: { select: { id: true, name: true, slug: true, active: true } },
      images: { orderBy: { order: "asc" }, take: 1, select: { url: true, alt: true } },
      variants: {
        where: { active: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          promoPrice: true,
          stockQty: true,
        },
      },
    },
  });

  const serialized = products.map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand,
    sku: product.sku,
    price: Number(product.price),
    promoPrice: product.promoPrice === null ? null : Number(product.promoPrice),
    stockQty: product.stockQty,
    imageUrl: product.images[0]?.url ?? null,
    category: product.category.active
      ? { id: product.category.id, name: product.category.name, slug: product.category.slug }
      : null,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      price: variant.price === null ? null : Number(variant.price),
      promoPrice: variant.promoPrice === null ? null : Number(variant.promoPrice),
      stockQty: variant.stockQty,
    })),
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Operação diária</p>
          <h1 className="font-serif text-2xl font-bold text-texto">Venda no balcão</h1>
          <p className="mt-1 max-w-2xl text-sm text-cinza">
            Registre a venda física, baixe o estoque e alimente os relatórios em uma única operação.
          </p>
        </div>
        <Link href="/admin/pedidos" className="rounded-xl border border-rosa/20 bg-white px-3 py-2 text-xs font-bold text-rosa-profundo">
          Ver pedidos
        </Link>
      </div>

      <CounterSaleForm products={serialized} />
    </div>
  );
}
