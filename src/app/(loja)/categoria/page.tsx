export const dynamic = "force-dynamic";

import {
  getBrands,
  getCategories,
  getProducts,
} from "@/lib/data";
import { ProductListClient } from "@/components/ProductListClient";
import { CatalogCategoryNav } from "@/components/CatalogCategoryNav";

export const revalidate = 60;

export default async function CategoriasIndexPage() {
  const [categories, products, brands] = await Promise.all([
    getCategories(),
    getProducts(),
    getBrands(),
  ]);

  return (
    <main>
      <div className="px-4 pt-4 pb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-rosa-profundo">
          Catálogo
        </p>

        <h1 className="font-serif font-bold text-2xl text-texto mt-1">
          Todos os produtos
        </h1>

        <p className="text-xs text-cinza mt-1">
          Encontre produtos por categoria, marca ou faixa de preço.
        </p>
      </div>

      <CatalogCategoryNav categories={categories} />

      <ProductListClient
        initialProducts={products}
        categorySlug=""
        subcategories={[]}
        brands={brands}
      />
    </main>
  );
}
