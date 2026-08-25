import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

const mobileFormDensity = `
  max-sm:[&_form]:!gap-2
  max-sm:[&_form_label]:!gap-0.5
  max-sm:[&_form_.input]:!rounded-[10px]
  max-sm:[&_form_.input]:!px-2.5
  max-sm:[&_form_.input]:!py-2
  max-sm:[&_form_.input]:!text-[13px]
  max-sm:[&_form_textarea.input]:!h-[76px]
  max-sm:[&_form_textarea.input]:!min-h-[76px]
  max-sm:[&_form_p]:!leading-4
  max-sm:[&_form>p]:!text-[10px]
  max-sm:[&_form_summary]:!py-2.5
`;

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        categories: true,
        variants: true,
        images: { orderBy: { order: "asc" } },
      },
    }),
    prisma.category.findMany({
      include: { subcategories: true },
      orderBy: { order: "asc" },
    }),
  ]);

  if (!product) notFound();

  const categoryIds = Array.from(
    new Set([product.categoryId, ...product.categories.map((item) => item.categoryId)])
  );

  return (
    <div>
      <h1 className="font-serif font-bold text-xl text-texto mb-4">Editar produto</h1>
      <div className={mobileFormDensity}>
        <ProductForm
          categories={categories}
          initial={{
            id: product.id,
            name: product.name,
            brand: product.brand,
            sku: product.sku,
            description: product.description,
            price: Number(product.price),
            promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
            costPrice: product.costPrice === null ? null : Number(product.costPrice),
            stockQty: product.stockQty,
            featured: product.featured,
            isNew: product.isNew,
            bestSeller: product.bestSeller,
            active: product.active,
            categoryId: product.categoryId,
            categoryIds,
            subcategoryId: product.subcategoryId,
            variants: product.variants.map((v) => ({ id: v.id, name: v.name, stockQty: v.stockQty })),
            images: product.images.map((image) => ({
              id: image.id,
              url: image.url,
              storagePath: image.storagePath,
              order: image.order,
            })),
          }}
        />
      </div>
    </div>
  );
}
