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
  const title = `${category.name} em Presidente Prudente`;
  const description =
    category.description?.trim() ||
    `${category.name} na Sra Make Prudente, loja de maquiagem e cosméticos em Presidente Prudente/SP. Veja produtos, disponibilidade e compre pelo catálogo.`;
  const image = category.imageUrl || undefined;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
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

export default async function CategoriaPage({ params }: { params: CategoryParams }) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [products, brands, categories] = await Promise.all([
    getProducts({ categorySlug: slug }),
    getBrands(),
    getCategories(),
  ]);

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
    name: `${category.name} em Presidente Prudente`,
    description:
      category.description?.trim() ||
      `${category.name} disponível na Sra Make Prudente em Presidente Prudente/SP.`,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#store` },
    inLanguage: "pt-BR",
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <CategoryViewTracker categorySlug={slug} />
      <div className="px-4 pt-4 pb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-rosa-profundo">Categoria</p>
        <h1 className="font-serif font-bold text-2xl text-texto mt-1">{category.name}</h1>
        {category.description ? (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-cinza">{category.description}</p>
        ) : null}
      </div>
      <div className="mb-3"><SearchBar /></div>
      <CatalogCategoryNav categories={categories} activeCategory={slug} />
      <Suspense fallback={<div className="px-4 py-8 text-sm text-cinza">Carregando produtos...</div>}>
        <ProductListClient
          key={slug}
          initialProducts={products}
          categorySlug={slug}
          subcategories={category.subcategories}
          brands={brands}
        />
      </Suspense>
    </main>
  );
}
