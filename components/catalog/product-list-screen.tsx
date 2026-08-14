"use client"

import { useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import { C, BRANDS, money, type Product, type CartItem } from "@/lib/catalog"
import { ProductCard } from "./product-card"
import { Chip, EmptyState } from "./ui"

export function ProductListScreen({
  products,
  cart,
  onAdd,
  onOpen,
  subOptions,
  emptyHint,
}: {
  products: Product[]
  cart: CartItem[]
  onAdd: (p: Product, v: string | null, q: number) => void
  onOpen: (p: Product) => void
  subOptions?: string[]
  emptyHint?: string
}) {
  const [sub, setSub] = useState("all")
  const [brand, setBrand] = useState("all")
  const [maxPrice, setMaxPrice] = useState(999)
  const [showFilters, setShowFilters] = useState(false)

  const cartQty = (id: string, variant: string | null) => {
    const item = cart.find((c) => c.productId === id && c.variant === variant)
    return item ? item.qty : 0
  }

  const filtered = products.filter((p) => {
    if (sub !== "all" && p.sub !== sub) return false
    if (brand !== "all" && p.brand !== brand) return false
    if ((p.promo || p.price) > maxPrice) return false
    return true
  })

  return (
    <div className="pb-6">
      {subOptions && subOptions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-2 no-scrollbar">
          <Chip active={sub === "all"} onClick={() => setSub("all")}>Todos</Chip>
          {subOptions.map((s) => (
            <Chip key={s} active={sub === s} onClick={() => setSub(s)}>{s}</Chip>
          ))}
        </div>
      )}

      <div className="px-4 flex items-center justify-between pt-1 pb-2">
        <p className="text-xs" style={{ color: C.cinza }}>{filtered.length} produtos</p>
        <button onClick={() => setShowFilters((v) => !v)} className="flex items-center gap-1 text-xs font-bold transition-transform active:scale-95" style={{ color: C.rosaProfundo }}>
          <SlidersHorizontal size={14} /> Filtros
        </button>
      </div>

      {showFilters && (
        <div className="mx-4 mb-3 p-3 rounded-2xl flex flex-col gap-3 animate-fade-in" style={{ backgroundColor: C.creme }}>
          <div>
            <p className="text-[11px] font-bold mb-1.5" style={{ color: C.texto }}>Marca</p>
            <div className="flex gap-2 flex-wrap">
              <Chip small active={brand === "all"} onClick={() => setBrand("all")}>Todas</Chip>
              {BRANDS.map((b) => (
                <Chip small key={b} active={brand === b} onClick={() => setBrand(b)}>{b}</Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold mb-1.5" style={{ color: C.texto }}>Até {money(maxPrice === 999 ? 100 : maxPrice)}</p>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={maxPrice === 999 ? 100 : maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-pink-600"
              aria-label="Preço máximo"
            />
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState hint={emptyHint} />
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} qtyInCart={cartQty(p.id, null)} onAdd={onAdd} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}
