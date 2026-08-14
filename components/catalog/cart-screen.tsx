"use client"

import { ShoppingCart, Minus, Plus, X } from "lucide-react"
import { C, PRODUCTS, money, type CartItem } from "@/lib/catalog"
import { ProductImage } from "./ui"
import type { Screen } from "./app"

export function CartScreen({
  cart,
  updateQty,
  removeItem,
  setScreen,
}: {
  cart: CartItem[]
  updateQty: (productId: string, variant: string | null, qty: number) => void
  removeItem: (productId: string, variant: string | null) => void
  setScreen: (s: Screen) => void
}) {
  const items = cart
    .map((c) => ({ ...c, product: PRODUCTS.find((p) => p.id === c.productId)! }))
    .filter((c) => c.product)
  const subtotal = items.reduce((sum, i) => sum + (i.product.promo || i.product.price) * i.qty, 0)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center text-center px-8 py-16 animate-fade-in">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: C.creme }}>
          <ShoppingCart size={26} style={{ color: C.rosaProfundo }} />
        </div>
        <p className="font-bold text-sm mb-1" style={{ color: C.texto }}>Seu carrinho está vazio</p>
        <p className="text-xs mb-4 leading-relaxed" style={{ color: C.cinza }}>Adicione produtos do catálogo para montar seu pedido.</p>
        <button
          onClick={() => setScreen("home")}
          className="text-sm font-bold px-5 py-2.5 rounded-full text-white transition-transform active:scale-95"
          style={{ backgroundColor: C.rosa }}
        >
          Ver catálogo
        </button>
      </div>
    )
  }

  return (
    <div className="pb-32 pt-3">
      <p className="px-4 font-serif font-bold text-lg mb-3" style={{ color: C.texto }}>Seu pedido</p>
      <div className="flex flex-col gap-3 px-4">
        {items.map((i) => (
          <div
            key={i.productId + (i.variant || "")}
            className="flex gap-3 rounded-2xl p-3"
            style={{ backgroundColor: "#fff", boxShadow: "var(--shadow-soft)" }}
          >
            <ProductImage product={i.product} className="w-16 h-16 rounded-xl flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase" style={{ color: C.cinza }}>{i.product.brand}</p>
              <p className="text-sm font-bold leading-snug" style={{ color: C.texto }}>{i.product.name}</p>
              {i.variant && <p className="text-xs" style={{ color: C.cinza }}>{i.variant}</p>}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center rounded-full" style={{ border: `1px solid ${C.bordaForte}` }}>
                  <button onClick={() => updateQty(i.productId, i.variant, i.qty - 1)} className="w-7 h-7 flex items-center justify-center" aria-label="Diminuir">
                    <Minus size={12} style={{ color: C.texto }} />
                  </button>
                  <span className="w-5 text-center font-bold text-xs" style={{ color: C.texto }}>{i.qty}</span>
                  <button onClick={() => updateQty(i.productId, i.variant, i.qty + 1)} className="w-7 h-7 flex items-center justify-center" aria-label="Aumentar">
                    <Plus size={12} style={{ color: C.texto }} />
                  </button>
                </div>
                <span className="font-extrabold text-sm" style={{ color: C.rosaProfundo }}>
                  {money((i.product.promo || i.product.price) * i.qty)}
                </span>
              </div>
            </div>
            <button onClick={() => removeItem(i.productId, i.variant)} className="self-start p-1 transition-transform active:scale-90" aria-label="Remover item">
              <X size={16} style={{ color: C.cinza }} />
            </button>
          </div>
        ))}
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-white px-4 py-3 max-w-md mx-auto" style={{ borderTop: `1px solid ${C.borda}` }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold" style={{ color: C.texto }}>Subtotal</span>
          <span className="font-extrabold text-lg" style={{ color: C.rosaProfundo }}>{money(subtotal)}</span>
        </div>
        <button
          onClick={() => setScreen("checkout")}
          className="w-full py-3.5 rounded-full font-bold text-sm text-white transition-transform active:scale-[0.98]"
          style={{ backgroundColor: C.rosa }}
        >
          Continuar pedido
        </button>
      </div>
    </div>
  )
}
