import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getProductById } from "@/lib/data";
import { ProductImage } from "@/components/ProductImage";
import { Badge, StockLabel } from "@/components/Badges";
import { money } from "@/lib/money";
import { waLink } from "@/lib/whatsapp";

export const revalidate = 60;

export default async function ProdutoPage({ params }: { params: { id: string } }) {
  const product = await getProductById(params.id);
  if (!product) notFound();

  const mainImage = product.images[0]?.url ?? null;

  return (
    <main>
      <ProductImage name={product.name} imageUrl={mainImage} className="w-full h-72" />

      <div className="p-5">
        <div className="flex items-center gap-1 mb-2">
          {product.isNew && <Badge tone="dourado">Novidade</Badge>}
          {product.bestSeller && <Badge tone="navy">Mais vendido</Badge>}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-cinza">{product.brand}</p>
        <h1 className="font-serif font-bold text-xl mb-2 text-texto">{product.name}</h1>

        <div className="flex items-baseline gap-2 mb-2">
          {product.promoPrice ? (
            <>
              <span className="text-2xl font-extrabold text-rosa-profundo">
                {money(product.promoPrice)}
              </span>
              <span className="text-sm line-through text-cinza">{money(product.price)}</span>
            </>
          ) : (
            <span className="text-2xl font-extrabold text-rosa-profundo">
              {money(product.price)}
            </span>
          )}
        </div>

        <StockLabel stock={product.stock} />

        {product.description && (
          <p className="text-sm mt-3 leading-relaxed text-texto">{product.description}</p>
        )}

        {product.variants.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold mb-2 text-texto">Variantes</p>
            <div className="flex gap-2 flex-wrap">
              {product.variants.map((v) => (
                <span
                  key={v.id}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                  style={{
                    borderColor: v.stock === "INDISPONIVEL" ? "#E9D9E4" : "#E4127B",
                    color: v.stock === "INDISPONIVEL" ? "#7A6C7F" : "#23142A",
                    opacity: v.stock === "INDISPONIVEL" ? 0.5 : 1,
                  }}
                >
                  {v.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl p-4 bg-creme text-center">
          <p className="text-xs text-cinza">
            O carrinho e a adição de produtos serão ligados na Fase 3 do plano.
          </p>
        </div>

        <div className="mt-6 rounded-2xl p-4 bg-creme">
          <p className="text-xs font-bold mb-1 text-texto">Precisa de ajuda?</p>
          <p className="text-xs mb-2 text-cinza">
            Ficou em dúvida sobre qual escolher? Fale com a gente.
          </p>
          <a
            href={waLink(`Oi! Tenho uma dúvida sobre o produto "${product.name}" do catálogo da Sra Make Prudente.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full text-white"
            style={{ backgroundColor: "#25D366" }}
          >
            <MessageCircle size={14} /> Falar com a Sra Make no WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
