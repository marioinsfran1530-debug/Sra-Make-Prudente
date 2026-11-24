"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { Badge, StockLabel } from "@/components/Badges";
import { useCart } from "@/components/CartProvider";
import { money } from "@/lib/money";
import { productPath } from "@/lib/product-url";
import type { PublicProduct } from "@/lib/data";

export function ProductCard({ product }: { product: PublicProduct }) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const disabled = product.stock === "INDISPONIVEL";
  const hasVariants = product.variants.length > 0;
  const mainImage = product.images[0]?.url ?? null;

  function handleQuickAdd() {
    // Produtos com variantes precisam abrir a página do produto
    // para o cliente escolher a opção antes de adicionar ao carrinho.
    if (hasVariants) return;

    if (disabled) return;

    addItem(
      {
        productId: product.id,
        variantId: null,
        variantName: null,
        name: product.name,
        brand: product.brand,
        category: product.category.name,
        sku: product.sku,
        price: product.promoPrice ?? product.price,
        imageUrl: mainImage,
      },
      1
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 4000);
  }

  const productHref = productPath(product);

  return (
    <div
      className="rounded-2xl overflow-hidden bg-white flex flex-col h-full min-h-[340px] transition hover:-translate-y-0.5 hover:shadow-lg"
      style={{ boxShadow: "0 2px 14px rgba(35,20,42,0.08)" }}
    >
      <Link href={productHref} className="block">
        <ProductImage
          name={product.name}
          imageUrl={mainImage}
          loading="lazy"
          className="w-full aspect-square"
        />
      </Link>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <div className="flex items-center gap-1 flex-wrap min-h-[24px]">
          {product.isNew && <Badge tone="dourado">Novidade</Badge>}
          {product.bestSeller && <Badge tone="navy">Mais procurado</Badge>}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-cinza min-h-[16px] line-clamp-1">
          {product.brand}
        </p>
        <Link
          href={productHref}
          className="text-sm font-bold leading-snug line-clamp-2 text-texto min-h-[40px]"
        >
          {product.name}
        </Link>
        <div className="mt-1 flex items-baseline gap-2 min-h-[24px]">
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
        <div className="min-h-[20px]">
          <StockLabel stock={product.stock} />
        </div>

        <div className="mt-auto pt-2">
          {hasVariants && !disabled ? (
            <Link
              href={productHref}
              className="w-full flex items-center justify-center gap-1 text-center py-2 rounded-xl text-sm font-bold transition border border-rosa-profundo bg-white text-rosa-profundo hover:bg-rosa/5"
            >
              Escolher opção
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={disabled}
              className="w-full flex items-center justify-center gap-1 text-center py-2 rounded-xl text-sm font-bold text-white transition hover:shadow-md disabled:opacity-40"
              style={{ backgroundColor: justAdded ? "#A6157A" : "#E4127B" }}
            >
              {disabled ? (
                "Indisponível"
              ) : justAdded ? (
                <>
                  <Check size={14} /> Adicionado
                </>
              ) : (
                <>
                  <Plus size={14} /> Adicionar
                </>
              )}
            </button>
          )}
          {justAdded && !hasVariants && (
            <Link
              href="/carrinho"
              role="status"
              className="mt-1.5 block text-center text-xs font-bold text-rosa-profundo underline"
            >
              Produto adicionado — Ver carrinho
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
