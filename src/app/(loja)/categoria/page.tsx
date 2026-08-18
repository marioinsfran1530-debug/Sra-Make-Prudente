import { Suspense } from "react";
import {
  getBrands,
  getCategories,
  getProducts,
} from "@/lib/data";
import { ProductListClient } from "@/components/ProductListClient";
import { CatalogCategoryNav } from "@/components/CatalogCategoryNav";
import { SearchBar } from "@/components/SearchBar";

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

      <div className="mb-3">
        <SearchBar />
      </div>

      <CatalogCategoryNav categories={categories} />

      <Suspense
        fallback={
          <div className="px-4 py-8 text-sm text-cinza">
            Carregando produtos...
          </div>
        }
      >
        <ProductListClient
          initialProducts={products}
          categorySlug=""
          subcategories={[]}
          brands={brands}
        />
      </Suspense>
    </main>
  );
}
