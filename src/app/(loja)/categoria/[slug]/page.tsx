import { notFound } from "next/navigation";
import { getCategoryBySlug, getProducts, getBrands } from "@/lib/data";
import { ProductListClient } from "@/components/ProductListClient";
import { CategoryViewTracker } from "@/components/ViewTrackers";

export const revalidate = 60;

export default async function CategoriaPage({
  params,
}: {
  params: { slug: string };
}) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  const [products, brands] = await Promise.all([
    getProducts({ categorySlug: params.slug }),
    getBrands(),
  ]);

  return (
    <main>
      <CategoryViewTracker categorySlug={params.slug} />
      <div className="px-4 pt-4 pb-1">
        <p className="font-serif font-bold text-xl text-texto">{category.name}</p>
      </div>
      <ProductListClient
        initialProducts={products}
        categorySlug={params.slug}
        subcategories={category.subcategories}
        brands={brands}
      />
    </main>
  );
}
