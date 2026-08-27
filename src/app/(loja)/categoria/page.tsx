import { Suspense } from "react";
import type { Metadata } from "next";
import {
  getBrands,
  getCategories,
  getProducts,
} from "@/lib/data";
import { ProductListClient } from "@/components/ProductListClient";
import { CatalogCategoryNav } from "@/components/CatalogCategoryNav";
import { SearchBar } from "@/components/SearchBar";

const SITE_URL = "https://www.sramakeprudente.com.br";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Maquiagem, Lash, Nail e Acessórios em Presidente Prudente",
  description:
    "Confira maquiagem, produtos para lash, nail e acessórios na Sra Make Prudente. Encontre por categoria, marca ou faixa de preço e finalize pelo WhatsApp.",
  alternates: {
    canonical: `${SITE_URL}/categoria`,
  },
  openGraph: {
    title: "Maquiagem, Lash, Nail e Acessórios em Presidente Prudente",
    description:
      "Confira o catálogo da Sra Make Prudente e encontre maquiagem, lash, nail e acessórios.",
    url: `${SITE_URL}/categoria`,
    type: "website",
  },
};

export default async function CategoriasIndexPage() {
  const [categories, products, brands] = await Promise.all([
    getCategories(),
    getProducts(),
    getBrands(),
  ]);

  return (
    <main>
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rosa-profundo">
          Catálogo completo
        </p>

        <h1 className="mt-0.5 font-serif text-xl font-bold text-texto sm:text-2xl">
          Todos os produtos
        </h1>

        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-cinza">
          Busque pelo nome ou explore por categoria, marca e faixa de preço.
        </p>
      </div>

      <div className="mt-1">
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
