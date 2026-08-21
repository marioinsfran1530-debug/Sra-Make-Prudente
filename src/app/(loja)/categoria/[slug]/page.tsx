import { Suspense } from "react";
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

const SITE_URL = "https://sramakeprudente.com.br";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return {};

  const canonicalUrl = `${SITE_URL}/categoria/${category.slug}`;
  const title = `${category.name} em Presidente Prudente`;
  const description =
    category.description?.trim() ||
    `${category.name} na Sra Make Prudente. Encontre produtos, escolha pelo catálogo e finalize seu atendimento pelo WhatsApp em Presidente Prudente/SP.`;
  const image = category.imageUrl || undefined;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      ...(image ? { images: [{ url: image, alt: category.name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
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

  const canonicalUrl = `${SITE_URL}/categoria/${category.slug}`;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Início",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Categorias",
        item: `${SITE_URL}/categoria`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

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

      <Suspense
        fallback={
          <div className="px-4 py-8 text-sm text-cinza">
            Carregando produtos...
          </div>
        }
      >
        <ProductListClient
          key={params.slug}
          initialProducts={products}
          categorySlug={params.slug}
          subcategories={category.subcategories}
          brands={brands}
        />
      </Suspense>
    </main>
  );
}
