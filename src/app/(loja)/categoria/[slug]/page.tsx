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
import { getCategorySeo } from "@/lib/categorySeo";

export const revalidate = 60;

const SITE_URL = "https://www.sramakeprudente.com.br";

type CategoryParams = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: CategoryParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  const canonicalUrl = `${SITE_URL}/categoria/${category.slug}`;
  const seo = getCategorySeo(category.slug, category.name);
  const description = category.description?.trim() || seo.description;
  const image = category.imageUrl || undefined;

  return {
    title: seo.title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: seo.title,
      description,
      url: canonicalUrl,
      type: "website",
      ...(image ? { images: [{ url: image, alt: category.name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: seo.title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function CategoriaPage({ params }: { params: CategoryParams }) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [products, brands, categories] = await Promise.all([
    getProducts({ categoryId: category.id }),
    getBrands(),
    getCategories(),
  ]);

  const seo = getCategorySeo(category.slug, category.name);
  const visibleDescription = category.description?.trim() || seo.intro;
  const canonicalUrl = `${SITE_URL}/categoria/${category.slug}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Categorias", item: `${SITE_URL}/categoria` },
      { "@type": "ListItem", position: 3, name: category.name, item: canonicalUrl },
    ],
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonicalUrl}#collection`,
    url: canonicalUrl,
    name: seo.title,
    description: category.description?.trim() || seo.description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: seo.about.map((name) => ({ "@type": "Thing", name })),
    provider: { "@id": `${SITE_URL}/#store` },
    inLanguage: "pt-BR",
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Produtos de ${category.name} na Sra Make Prudente`,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 24).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      url: `${SITE_URL}/produto/${product.id}`,
    })),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <CategoryViewTracker categorySlug={category.slug} />

      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rosa-profundo">
          Categoria
        </p>
        <h1 className="mt-0.5 font-serif text-xl font-bold text-texto sm:text-2xl">
          {seo.title}
        </h1>
        <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-cinza sm:text-sm">
          {visibleDescription}
        </p>
      </div>

      <div className="mt-1">
        <SearchBar />
      </div>

      <CatalogCategoryNav categories={categories} activeCategory={category.slug} />

      <Suspense fallback={<div className="px-4 py-8 text-sm text-cinza">Carregando produtos...</div>}>
        <ProductListClient
          key={category.slug}
          initialProducts={products}
          categorySlug={category.slug}
          subcategories={category.subcategories}
          brands={brands}
        />
      </Suspense>
    </main>
  );
}
