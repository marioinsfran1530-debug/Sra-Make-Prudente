import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCategoryBySlug,
  getProducts,
  getBrands,
  getCategories,
} from "@/lib/data";
import { ProductListClient } from "@/components/ProductListClient";
import { CategoryViewTracker } from "@/components/ViewTrackers";
import { CatalogCategoryNav } from "@/components/CatalogCategoryNav";
import { SearchBar } from "@/components/SearchBar";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return {};
  return {
    title: category.name,
    description: `${category.name} no catálogo da Sra Make Prudente — escolha pelo catálogo e confirme pelo WhatsApp.`,
  };
}

export default async function CategoriaPage({
  params,
}: {
  params: { slug: string };
}) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  const [products, brands, categories] = await Promise.all([
    getProducts({ categorySlug: params.slug }),
    getBrands(),
    getCategories(),
  ]);

  return (
    <main>
      <CategoryViewTracker categorySlug={params.slug} />
      <div className="px-4 pt-4 pb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-rosa-profundo">
          Categoria
        </p>

        <p className="font-serif font-bold text-2xl text-texto mt-1">
          {category.name}
        </p>
      </div>

      <div className="mb-3">
        <SearchBar />
      </div>

      <CatalogCategoryNav
        categories={categories}
        activeCategory={params.slug}
      />

      <ProductListClient
        key={params.slug}
        initialProducts={products}
        categorySlug={params.slug}
        subcategories={category.subcategories}
        brands={brands}
      />
    </main>
  );
}
