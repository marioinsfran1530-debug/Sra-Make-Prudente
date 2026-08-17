"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { Badge, StockLabel } from "@/components/Badges";
import { useCart } from "@/components/CartProvider";
import { money } from "@/lib/money";
import type { PublicProduct } from "@/lib/data";

export function ProductCard({ product }: { product: PublicProduct }) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const disabled = product.stock === "INDISPONIVEL";
  const hasVariants = product.variants.length > 0;
  const mainImage = product.images[0]?.url ?? null;

  function handleQuickAdd(e: React.MouseEvent) {
    // Produtos com variantes precisam abrir a página do produto
    // para o cliente escolher a opção antes de adicionar ao carrinho.
    if (hasVariants) return;

    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    addItem(
      {
        productId: product.id,
        variantId: null,
        variantName: null,
        name: product.name,
        brand: product.brand,
        sku: product.sku,
        price: product.promoPrice ?? product.price,
        imageUrl: mainImage,
      },
      1
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <Link
      href={`/produto/${product.id}`}
      className="rounded-2xl overflow-hidden bg-white flex flex-col h-full min-h-[360px] transition hover:-translate-y-0.5 hover:shadow-lg"
      style={{ boxShadow: "0 2px 14px rgba(35,20,42,0.08)" }}
    >
      <ProductImage name={product.name} imageUrl={mainImage} className="w-full aspect-square" />
      <div className="p-3 flex flex-col gap-1 flex-1">
        <div className="flex items-center gap-1 flex-wrap min-h-[24px]">
          {product.isNew && <Badge tone="dourado">Novidade</Badge>}
          {product.bestSeller && <Badge tone="navy">Mais vendido</Badge>}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-cinza min-h-[16px] line-clamp-1">
          {product.brand}
        </p>
        <p className="text-sm font-bold leading-snug line-clamp-2 text-texto min-h-[40px]">
          {product.name}
        </p>
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
          <button
            onClick={handleQuickAdd}
            disabled={disabled}
            className="w-full flex items-center justify-center gap-1 text-center py-2 rounded-xl text-sm font-bold disabled:opacity-40"
            style={{
              backgroundColor: justAdded ? "#A6157A" : "#E4127B",
              color: "#fff",
            }}
          >
            {disabled ? (
              "Indisponível"
            ) : hasVariants ? (
              "Escolher opção"
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
        </div>
      </div>
    </Link>
  );
}
