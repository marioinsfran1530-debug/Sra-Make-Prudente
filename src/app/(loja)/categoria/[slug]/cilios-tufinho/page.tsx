import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProducts } from "@/lib/data";
import { ProductCard } from "@/components/ProductCard";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  if (params.slug !== "lash") return {};

  return {
    title: "Cílios Tufinho em Presidente Prudente | Sra Make",
    description:
      "Cílios tufinho em Presidente Prudente em diferentes modelos e tamanhos. Consulte preços, estoque, retirada e entrega na Sra Make Prudente.",
    alternates: {
      canonical: "/categoria/lash/cilios-tufinho",
    },
  };
}

export default async function CiliosTufinhoPage({
  params,
}: {
  params: { slug: string };
}) {
  if (params.slug !== "lash") notFound();

  const products = await getProducts({ categorySlug: "lash", search: "tufinho" });

  return (
    <main className="pb-8">
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
        <p className="mt-2 text-sm leading-6 text-cinza">
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
          Além dos cílios tufinho, a categoria Lash reúne colas, pinças, removedores e outros
          acessórios para aplicação e manutenção de cílios.
        </p>
        <Link
          href="/categoria/lash"
          className="mt-4 inline-block rounded-full bg-white px-4 py-2 font-semibold text-rosa-profundo border border-[#E9D9E4]"
        >
          Ver todos os produtos para Lash
        </Link>
      </section>
    </main>
  );
}
