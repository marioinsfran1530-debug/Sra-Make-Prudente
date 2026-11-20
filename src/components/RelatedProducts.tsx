import { ProductCard } from "@/components/ProductCard";
import type { PublicProduct } from "@/lib/data";

function Row({ title, subtitle, products }: { title: string; subtitle?: string; products: PublicProduct[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mt-8" aria-label={title}>
      <h2 className="font-serif text-xl font-bold text-texto">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-cinza">{subtitle}</p>}
      <div className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        {products.map((product) => (
          <div key={product.id} className="flex w-[46%] max-w-[230px] shrink-0 snap-start sm:w-[200px]">
            <div className="w-full">
              <ProductCard product={product} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// "Quem comprou este também levou" vem dos pedidos reais; "Você também pode gostar"
// completa com a mesma categoria enquanto o histórico é pequeno.
export function RelatedProducts({ together, similar }: { together: PublicProduct[]; similar: PublicProduct[] }) {
  if (together.length === 0 && similar.length === 0) return null;
  return (
    <>
      <Row
        title="Quem comprou este também levou"
        subtitle="Produtos que clientes compraram junto."
        products={together}
      />
      <Row title="Você também pode gostar" products={similar} />
    </>
  );
}
