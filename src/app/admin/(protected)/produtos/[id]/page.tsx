import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditarProdutoPage({
  params,
}: {
  params: { id: string };
}) {
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: true,
        images: {
          orderBy: { order: "asc" },
        },
      },
    }),
    prisma.category.findMany({
      include: { subcategories: true },
      orderBy: { order: "asc" },
    }),
  ]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="font-serif font-bold text-xl text-texto mb-4">
        Editar produto
      </h1>

      <ProductForm
        categories={categories}
        initial={{
          id: product.id,
          name: product.name,
          brand: product.brand,
          sku: product.sku,
          description: product.description,
          price: Number(product.price),
          promoPrice: product.promoPrice
            ? Number(product.promoPrice)
            : null,
          stockQty: product.stockQty,
          featured: product.featured,
          isNew: product.isNew,
          bestSeller: product.bestSeller,
          active: product.active,
          categoryId: product.categoryId,
          subcategoryId: product.subcategoryId,

          variants: product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            stockQty: v.stockQty,
          })),

          images: product.images.map((image) => ({
            id: image.id,
            url: image.url,
            storagePath: image.storagePath,
            order: image.order,
          })),
        }}
      />
    </div>
  );
}
