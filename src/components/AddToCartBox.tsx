"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, Check } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import type { PublicProduct } from "@/lib/data";

export function AddToCartBox({ product }: { product: PublicProduct }) {
  const router = useRouter();
  const { addItem } = useCart();
  const hasVariants = product.variants.length > 0;
  const [variantId, setVariantId] = useState<string | null>(
    hasVariants ? product.variants.find((v) => v.stock !== "INDISPONIVEL")?.id ?? null : null
  );
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const selectedVariant = product.variants.find((v) => v.id === variantId) ?? null;
  const outOfStock = hasVariants
    ? !selectedVariant || selectedVariant.stock === "INDISPONIVEL"
    : product.stock === "INDISPONIVEL";

  const unitPrice =
    selectedVariant?.promoPrice ??
    selectedVariant?.price ??
    product.promoPrice ??
    product.price;

  function handleAdd() {
    if (outOfStock) return;
    addItem(
      {
        productId: product.id,
        variantId: selectedVariant?.id ?? null,
        variantName: selectedVariant?.name ?? null,
        name: product.name,
        brand: product.brand,
        sku: product.sku,
        price: unitPrice,
        imageUrl: product.images[0]?.url ?? null,
      },
      qty
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <div>
      {hasVariants && (
        <div className="mt-4">
          <p className="text-xs font-bold mb-2 text-texto">Variantes</p>
          <div className="flex gap-2 flex-wrap">
            {product.variants.map((v) => {
              const disabled = v.stock === "INDISPONIVEL";
              const active = v.id === variantId;
              return (
                <button
                  key={v.id}
                  disabled={disabled}
                  onClick={() => setVariantId(v.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border disabled:opacity-40"
                  style={
                    active
                      ? { backgroundColor: "#E4127B", borderColor: "#E4127B", color: "#fff" }
                      : { borderColor: "#E9D9E4", color: "#23142A" }
                  }
                >
                  {v.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <div className="flex items-center rounded-full border border-rosa/20">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-9 h-9 flex items-center justify-center"
          >
            <Minus size={14} className="text-texto" />
          </button>
          <span className="w-6 text-center font-bold text-sm text-texto">{qty}</span>
          <button onClick={() => setQty((q) => q + 1)} className="w-9 h-9 flex items-center justify-center">
            <Plus size={14} className="text-texto" />
          </button>
        </div>
        <button
          disabled={outOfStock}
          onClick={handleAdd}
          className="flex-1 py-3 rounded-full font-bold text-sm text-white disabled:opacity-40 flex items-center justify-center gap-1.5"
          style={{ backgroundColor: justAdded ? "#A6157A" : "#E4127B" }}
        >
          {outOfStock ? (
            "Indisponível"
          ) : justAdded ? (
            <>
              <Check size={16} /> Adicionado
            </>
          ) : (
            "Adicionar ao carrinho"
          )}
        </button>
      </div>

      {justAdded && (
        <button
          onClick={() => router.push("/carrinho")}
          className="w-full mt-2 text-xs font-bold text-rosa-profundo underline"
        >
          Ver carrinho
        </button>
      )}
    </div>
  );
}
