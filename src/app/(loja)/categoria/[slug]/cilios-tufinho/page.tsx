import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProducts } from "@/lib/data";
import { ProductCard } from "@/components/ProductCard";

export const revalidate = 60;

const SITE_URL = "https://www.sramakeprudente.com.br";
const CANONICAL_URL = `${SITE_URL}/categoria/lash/cilios-tufinho`;

type PageParams = Promise<{ slug: string }>;

export const metadata: Metadata = {
  title: "Cílios Tufinho em Presidente Prudente | Sra Make",
  description:
    "Cílios tufinho em Presidente Prudente em diferentes modelos e tamanhos. Consulte preços, estoque, retirada e entrega na Sra Make Prudente.",
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    title: "Cílios Tufinho em Presidente Prudente | Sra Make",
    description:
      "Encontre cílios tufinho em Presidente Prudente, com opções para uso pessoal e profissional, retirada e entrega local.",
    url: CANONICAL_URL,
    type: "website",
  },
};

export default async function CiliosTufinhoPage({ params }: { params: PageParams }) {
  const { slug } = await params;
  if (slug !== "lash") notFound();

  const products = await getProducts({ categorySlug: "lash", search: "tufinho" });

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Lash", item: `${SITE_URL}/categoria/lash` },
      { "@type": "ListItem", position: 3, name: "Cílios Tufinho", item: CANONICAL_URL },
    ],
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    url: CANONICAL_URL,
    name: "Cílios Tufinho em Presidente Prudente",
    description:
      "Cílios tufinho disponíveis na Sra Make Prudente, com consulta de estoque, retirada e entrega local.",
    provider: { "@id": `${SITE_URL}/#store` },
    inLanguage: "pt-BR",
  };

  return (
    <main className="pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <section className="px-4 pt-4 pb-4">
        <p className="text-xs text-cinza">
          <Link href="/categoria/lash" className="font-semibold text-rosa-profundo">
            Produtos para Lash
          </Link>{" "}
          / Cílios tufinho
        </p>
        <h1 className="mt-2 font-serif text-2xl font-bold text-texto">
          Cílios Tufinho em Presidente Prudente
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-cinza">
          Encontre cílios tufinho em Presidente Prudente em diferentes modelos, tamanhos e
          quantidades. Consulte os produtos disponíveis, preços e estoque para retirada na Sra
          Make ou entrega local.
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
          Além dos cílios tufinho, a Sra Make reúne colas, pinças, removedores, cílios postiços,
          kits e outros acessórios para aplicação e manutenção de cílios em Presidente Prudente.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/categoria/lash"
            className="rounded-full border border-[#E9D9E4] bg-white px-4 py-2 font-semibold text-rosa-profundo"
          >
            Ver produtos para Lash
          </Link>
          <Link
            href="/loja"
            className="rounded-full border border-[#E9D9E4] bg-white px-4 py-2 font-semibold text-rosa-profundo"
          >
            Ver loja em Presidente Prudente
          </Link>
        </div>
      </section>
    </main>
  );
}
