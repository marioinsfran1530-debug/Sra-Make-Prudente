import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategoryBySlug, getProducts, getBrands } from "@/lib/data";
import { ProductListClient } from "@/components/ProductListClient";
import { CategoryViewTracker } from "@/components/ViewTrackers";

export const revalidate = 60;

const SEO_BY_SLUG: Record<
  string,
  { title: string; description: string; heading: string; intro: string }
> = {
  cosmeticos: {
    title: "Loja de Cosméticos em Presidente Prudente | Sra Make",
    description:
      "Loja de cosméticos em Presidente Prudente com skincare, cuidados pessoais e produtos de beleza. Consulte preços, estoque, retirada e entrega na Sra Make.",
    heading: "Cosméticos em Presidente Prudente",
    intro:
      "A Sra Make é uma loja de cosméticos em Presidente Prudente com opções para skincare, cuidados pessoais e beleza. Consulte os produtos disponíveis, preços e estoque para retirada ou entrega local.",
  },
  lash: {
    title: "Produtos para Lash e Cílios em Presidente Prudente | Sra Make",
    description:
      "Produtos para lash em Presidente Prudente: cílios tufinho, colas, pinças, removedores e acessórios. Consulte estoque, preços, retirada e entrega na Sra Make.",
    heading: "Produtos para Lash e Cílios em Presidente Prudente",
    intro:
      "Encontre produtos para lash em Presidente Prudente para aplicação, manutenção e extensão de cílios. A Sra Make reúne cílios tufinho, colas, pinças, removedores e acessórios com consulta de estoque pelo catálogo.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return {};

  const seo = SEO_BY_SLUG[params.slug];
  return {
    title: seo?.title ?? category.name,
    description:
      seo?.description ??
      `${category.name} no catálogo da Sra Make Prudente — escolha pelo catálogo e confirme pelo WhatsApp.`,
    alternates: {
      canonical: `/categoria/${params.slug}`,
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

  const [products, brands] = await Promise.all([
    getProducts({ categorySlug: params.slug }),
    getBrands(),
  ]);

  const seo = SEO_BY_SLUG[params.slug];

  return (
    <main>
      <CategoryViewTracker categorySlug={params.slug} />
      <div className="px-4 pt-4 pb-3">
        <h1 className="font-serif font-bold text-xl text-texto">
          {seo?.heading ?? category.name}
        </h1>
        {seo?.intro && (
          <p className="mt-2 text-sm leading-6 text-cinza">{seo.intro}</p>
        )}
      </div>

      <ProductListClient
        initialProducts={products}
        categorySlug={params.slug}
        subcategories={category.subcategories}
        brands={brands}
      />

      {params.slug === "lash" && (
        <section className="mx-4 mb-8 rounded-2xl bg-creme p-5 text-sm leading-6 text-texto">
          <h2 className="font-serif text-lg font-bold">
            Onde comprar produtos para Lash em Presidente Prudente
          </h2>
          <p className="mt-2">
            Na Sra Make Prudente você encontra itens para profissionais e para uso pessoal,
            incluindo cílios tufinho, colas, pinças, removedores e acessórios para aplicação
            de cílios. Consulte a disponibilidade no catálogo e escolha retirada ou entrega
            local conforme a disponibilidade.
          </p>
          <h2 className="mt-5 font-serif text-lg font-bold">
            Cílios tufinho e acessórios para aplicação
          </h2>
          <p className="mt-2">
            Para quem procura cílios tufinho em Presidente Prudente, reunimos modelos e
            tamanhos diferentes em uma página específica para facilitar a escolha.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/categoria/lash/cilios-tufinho"
              className="rounded-full bg-white px-4 py-2 font-semibold text-rosa-profundo border border-[#E9D9E4]"
            >
              Ver cílios tufinho
            </Link>
            <Link
              href="/loja"
              className="rounded-full bg-white px-4 py-2 font-semibold text-rosa-profundo border border-[#E9D9E4]"
            >
              Ver loja em Presidente Prudente
            </Link>
          </div>
        </section>
      )}

      {params.slug === "cosmeticos" && (
        <section className="mx-4 mb-8 rounded-2xl bg-creme p-5 text-sm leading-6 text-texto">
          <h2 className="font-serif text-lg font-bold">
            Loja de cosméticos em Presidente Prudente
          </h2>
          <p className="mt-2">
            A Sra Make reúne cosméticos, skincare e itens de cuidados pessoais para quem
            procura comprar em Presidente Prudente. Consulte preços e estoque online antes
            de visitar a loja ou solicitar atendimento pelo catálogo.
          </p>
          <div className="mt-4">
            <Link
              href="/loja"
              className="inline-block rounded-full bg-white px-4 py-2 font-semibold text-rosa-profundo border border-[#E9D9E4]"
            >
              Conhecer a loja em Presidente Prudente
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
