"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Minus, X } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { ProductImage } from "@/components/ProductImage";
import { money } from "@/lib/money";
import { trackEvent } from "@/lib/analytics";

export default function CarrinhoPage() {
  const router = useRouter();
  const { items, subtotal, updateQty, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <main className="flex flex-col items-center text-center px-8 py-16">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3 bg-creme">
          <ShoppingCart size={26} className="text-rosa-profundo" />
        </div>
        <p className="font-bold text-sm mb-1 text-texto">Seu carrinho está vazio</p>
        <p className="text-xs mb-4 text-cinza">
          Adicione produtos do catálogo para montar seu pedido.
        </p>
        <button
          onClick={() => router.push("/categoria")}
          className="text-sm font-bold px-5 py-2.5 rounded-full text-white"
          style={{ backgroundColor: "#E4127B" }}
        >
          Ver catálogo
        </button>
      </main>
    );
  }

  return (
    <main className="pb-32 pt-3">
      <p className="px-4 font-serif font-bold text-lg mb-3 text-texto">Seu pedido</p>
      <div className="flex flex-col gap-3 px-4">
        {items.map((i) => (
          <div
            key={i.productId + (i.variantId ?? "")}
            className="flex gap-3 rounded-2xl p-3 bg-white"
            style={{ boxShadow: "0 2px 14px rgba(35,20,42,0.06)" }}
          >
            <ProductImage
              name={i.name}
              imageUrl={i.imageUrl}
              className="w-16 h-16 rounded-xl flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase text-cinza">{i.brand}</p>
              <p className="text-sm font-bold leading-snug text-texto">{i.name}</p>
              {i.variantName && <p className="text-xs text-cinza">{i.variantName}</p>}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center rounded-full border border-rosa/20">
                  <button
                    onClick={() => updateQty(i.productId, i.variantId, i.qty - 1)}
                    className="w-7 h-7 flex items-center justify-center"
                  >
                    <Minus size={12} className="text-texto" />
                  </button>
                  <span className="w-5 text-center font-bold text-xs text-texto">{i.qty}</span>
                  <button
                    onClick={() => updateQty(i.productId, i.variantId, i.qty + 1)}
                    className="w-7 h-7 flex items-center justify-center"
                  >
                    <Plus size={12} className="text-texto" />
                  </button>
                </div>
                <span className="font-extrabold text-sm text-rosa-profundo">
                  {money(i.price * i.qty)}
                </span>
              </div>
            </div>
            <button onClick={() => removeItem(i.productId, i.variantId)} className="self-start p-1">
              <X size={16} className="text-cinza" />
            </button>
          </div>
        ))}
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-white px-4 py-3 max-w-md mx-auto border-t border-rosa/10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-texto">Subtotal</span>
          <span className="font-extrabold text-lg text-rosa-profundo">{money(subtotal)}</span>
        </div>
        <button
          onClick={() => {
            trackEvent("begin_checkout", { itemCount: items.length, subtotal });
            router.push("/checkout");
          }}
          className="w-full py-3.5 rounded-full font-bold text-sm text-white"
          style={{ backgroundColor: "#E4127B" }}
        >
          Continuar pedido
        </button>
      </div>
    </main>
  );
}
