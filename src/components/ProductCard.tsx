import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { Badge, StockLabel } from "@/components/Badges";
import { money } from "@/lib/money";
import type { PublicProduct } from "@/lib/data";

export function ProductCard({ product }: { product: PublicProduct }) {
  const disabled = product.stock === "INDISPONIVEL";
  const mainImage = product.images[0]?.url ?? null;

  return (
    <Link
      href={`/produto/${product.id}`}
      className="rounded-2xl overflow-hidden bg-white flex flex-col"
      style={{ boxShadow: "0 2px 14px rgba(35,20,42,0.08)" }}
    >
      <ProductImage name={product.name} imageUrl={mainImage} className="w-full aspect-square" />
      <div className="p-3 flex flex-col gap-1 flex-1">
        <div className="flex items-center gap-1 flex-wrap">
          {product.isNew && <Badge tone="dourado">Novidade</Badge>}
          {product.bestSeller && <Badge tone="navy">Mais vendido</Badge>}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-cinza">
          {product.brand}
        </p>
        <p className="text-sm font-bold leading-snug line-clamp-2 text-texto">
          {product.name}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          {product.promoPrice ? (
            <>
              <span className="text-base font-extrabold text-rosa-profundo">
                {money(product.promoPrice)}
              </span>
              <span className="text-xs line-through text-cinza">{money(product.price)}</span>
            </>
          ) : (
            <span className="text-base font-extrabold text-rosa-profundo">
              {money(product.price)}
            </span>
          )}
        </div>
        <StockLabel stock={product.stock} />
        <div className="mt-2">
          <span
            className="w-full block text-center py-2 rounded-xl text-sm font-bold"
            style={{
              backgroundColor: disabled ? "#E9D9E4" : "#E4127B",
              color: disabled ? "#7A6C7F" : "#fff",
            }}
          >
            {disabled ? "Indisponível" : product.variants.length > 0 ? "Escolher" : "Ver produto"}
          </span>
        </div>
      </div>
    </Link>
  );
}
