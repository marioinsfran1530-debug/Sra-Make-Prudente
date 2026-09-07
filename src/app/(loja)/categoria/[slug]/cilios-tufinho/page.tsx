import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategoryBySlug, getProducts } from "@/lib/data";
import { productPath } from "@/lib/product-url";
import { ProductCard } from "@/components/ProductCard";

export const revalidate = 60;

const SITE_URL = "https://www.sramakeprudente.com.br";

type PageParams = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== "lash") return {};

  const title = "Cílios Tufinho em Presidente Prudente";
  const description =
    "Cílios tufinho em Presidente Prudente em diferentes modelos e tamanhos. Consulte preços, disponibilidade, retirada e entrega na Sra Make Prudente.";
  const canonical = `${SITE_URL}/categoria/lash/cilios-tufinho`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title: `${title} | Sra Make`, description, url: canonical, type: "website" },
    twitter: { card: "summary", title: `${title} | Sra Make`, description },
  };
}

export default async function CiliosTufinhoPage({ params }: { params: PageParams }) {
  const { slug } = await params;
  if (slug !== "lash") notFound();

  const category = await getCategoryBySlug("lash");
  if (!category) notFound();

  const products = await getProducts({ categoryId: category.id, search: "tufinho" });
  const canonicalUrl = `${SITE_URL}/categoria/lash/cilios-tufinho`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Lash", item: `${SITE_URL}/categoria/lash` },
      { "@type": "ListItem", position: 3, name: "Cílios Tufinho", item: canonicalUrl },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Cílios tufinho em Presidente Prudente",
    numberOfItems: products.length,
    itemListElement: products.slice(0, 24).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      url: `${SITE_URL}${productPath(product)}`,
    })),
  };

  return (
    <main className="pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <section className="px-4 pt-4 pb-4">
        <p className="text-xs text-cinza">
          <Link href="/categoria/lash" className="font-semibold text-rosa-profundo">
            Lash
          </Link>{" "}
          / Cílios tufinho
        </p>
        <h1 className="mt-2 font-serif text-2xl font-bold text-texto">
          Cílios Tufinho em Presidente Prudente
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-cinza">
          Encontre cílios tufinho em Presidente Prudente em diferentes modelos, tamanhos e
          quantidades. Consulte os produtos disponíveis, preços e estoque para retirada ou
          entrega local pela Sra Make Prudente.
        </p>
      </section>

      <section aria-label="Cílios tufinho disponíveis">
        <div className="px-4 pb-2">
          <p className="text-xs text-cinza">{products.length} produtos encontrados</p>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 px-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mx-4 rounded-2xl bg-creme p-5 text-sm leading-6 text-texto">
            O estoque de cílios tufinho pode variar. Consulte a categoria Lash para ver os
            produtos disponíveis no momento.
          </div>
        )}
      </section>

      <section className="mx-4 mt-6 rounded-2xl bg-creme p-5 text-sm leading-6 text-texto">
        <h2 className="font-serif text-lg font-bold">Produtos para aplicação de cílios</h2>
        <p className="mt-2">
          Além dos cílios tufinho, a categoria Lash reúne colas, pinças, removedores, kits e
          outros acessórios para aplicação e manutenção de cílios.
        </p>
        <Link
          href="/categoria/lash"
          className="mt-4 inline-block rounded-full border border-[#E9D9E4] bg-white px-4 py-2 font-semibold text-rosa-profundo"
        >
          Ver todos os produtos para Lash
        </Link>
      </section>
    </main>
  );
}
