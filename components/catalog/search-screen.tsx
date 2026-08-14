"use client"

import { Search } from "lucide-react"
import { C, PRODUCTS, type Product, type CartItem } from "@/lib/catalog"
import { ProductCard } from "./product-card"
import { EmptyState } from "./ui"

export function SearchScreen({
  search,
  cart,
  onAdd,
  onOpen,
}: {
  search: string
  cart: CartItem[]
  onAdd: (p: Product, v: string | null, q: number) => void
  onOpen: (p: Product) => void
}) {
  const q = search.trim().toLowerCase()
  const results = q
    ? PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.sub.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      )
    : []

  const cartQty = (id: string, variant: string | null) => {
    const item = cart.find((c) => c.productId === id && c.variant === variant)
    return item ? item.qty : 0
  }

  if (!q) {
    return (
      <div className="px-4 pt-8 text-center">
        <Search size={30} style={{ color: C.cinza }} className="mx-auto mb-2" />
        <p className="text-sm" style={{ color: C.cinza }}>Digite o nome do produto, marca ou categoria.</p>
      </div>
    )
  }

  return (
    <div className="pb-6 pt-2">
      <p className="px-4 text-xs mb-2" style={{ color: C.cinza }}>
        {results.length} resultados para {`"${search}"`}
      </p>
      {results.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} qtyInCart={cartQty(p.id, null)} onAdd={onAdd} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}
