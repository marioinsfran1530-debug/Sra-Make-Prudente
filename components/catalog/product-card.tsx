"use client"

import { Plus, ChevronRight } from "lucide-react"
import { C, money, type Product } from "@/lib/catalog"
import { ProductImage, Badge, StockLabel } from "./ui"

export function ProductCard({
  product,
  qtyInCart,
  onAdd,
  onOpen,
}: {
  product: Product
  qtyInCart: number
  onAdd: (product: Product, variant: string | null, qty: number) => void
  onOpen: (product: Product) => void
}) {
  const disabled = product.stock === "indisponivel"
  return (
    <div
      className="rounded-2xl overflow-hidden bg-white flex flex-col h-full transition-shadow duration-200 hover:shadow-[0_8px_30px_rgba(35,20,42,0.14)]"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <button onClick={() => onOpen(product)} className="text-left group relative">
        <ProductImage product={product} className="w-full aspect-square transition-transform duration-300 group-hover:scale-[1.03]" />
        {product.promo && (
          <span
            className="absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-full text-white"
            style={{ backgroundColor: C.vermelho }}
          >
            Promo
          </span>
        )}
      </button>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <div className="flex items-center gap-1 flex-wrap min-h-[20px]">
          {product.isNew && <Badge tone="dourado">Novidade</Badge>}
          {product.bestSeller && <Badge tone="navy">Mais vendido</Badge>}
        </div>
        <button onClick={() => onOpen(product)} className="text-left">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.cinza }}>{product.brand}</p>
          <p className="text-sm font-bold leading-snug line-clamp-2" style={{ color: C.texto }}>{product.name}</p>
        </button>
        <div className="mt-1 flex items-baseline gap-2">
          {product.promo ? (
            <>
              <span className="text-base font-extrabold" style={{ color: C.rosaProfundo }}>{money(product.promo)}</span>
              <span className="text-xs line-through" style={{ color: C.cinza }}>{money(product.price)}</span>
            </>
          ) : (
            <span className="text-base font-extrabold" style={{ color: C.rosaProfundo }}>{money(product.price)}</span>
          )}
        </div>
        <StockLabel stock={product.stock} />
        <div className="mt-2 mt-auto pt-2">
          {product.variants ? (
            <button
              onClick={() => onOpen(product)}
              disabled={disabled}
              className="w-full py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-40 transition-transform active:scale-[0.97]"
              style={{ backgroundColor: C.rosa, color: "#fff" }}
            >
              Escolher <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => onAdd(product, null, 1)}
              disabled={disabled}
              className="w-full py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-40 relative transition-transform active:scale-[0.97]"
              style={{ backgroundColor: qtyInCart ? C.rosaProfundo : C.rosa, color: "#fff" }}
            >
              <Plus size={14} /> {qtyInCart ? `Adicionado (${qtyInCart})` : "Adicionar"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
