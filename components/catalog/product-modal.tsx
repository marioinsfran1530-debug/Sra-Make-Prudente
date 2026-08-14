"use client"

import { useState } from "react"
import { X, Minus, Plus, MessageCircle } from "lucide-react"
import { C, money, waLink, type Product } from "@/lib/catalog"
import { ProductImage, Badge, StockLabel } from "./ui"

export function ProductModal({
  product,
  onClose,
  onAdd,
}: {
  product: Product
  onClose: () => void
  onAdd: (p: Product, v: string | null, q: number) => void
}) {
  const [variant, setVariant] = useState<string | null>(product.variants ? product.variants.options[0] : null)
  const [qty, setQty] = useState(1)
  const disabled = product.stock === "indisponivel"

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
      style={{ backgroundColor: "rgba(19,27,51,0.5)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl overflow-y-auto max-h-[92vh] animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <ProductImage product={product} className="w-full h-64" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-90"
            style={{ backgroundColor: "#fff" }}
            aria-label="Fechar"
          >
            <X size={18} style={{ color: C.texto }} />
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-1 mb-2">
            {product.isNew && <Badge tone="dourado">Novidade</Badge>}
            {product.bestSeller && <Badge tone="navy">Mais vendido</Badge>}
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.cinza }}>{product.brand}</p>
          <p className="font-serif font-bold text-xl mb-2 text-balance" style={{ color: C.texto }}>{product.name}</p>
          <div className="flex items-baseline gap-2 mb-2">
            {product.promo ? (
              <>
                <span className="text-2xl font-extrabold" style={{ color: C.rosaProfundo }}>{money(product.promo)}</span>
                <span className="text-sm line-through" style={{ color: C.cinza }}>{money(product.price)}</span>
              </>
            ) : (
              <span className="text-2xl font-extrabold" style={{ color: C.rosaProfundo }}>{money(product.price)}</span>
            )}
          </div>
          <StockLabel stock={product.stock} />
          <p className="text-sm mt-3 leading-relaxed" style={{ color: C.texto }}>{product.desc}</p>

          {product.variants && (
            <div className="mt-4">
              <p className="text-xs font-bold mb-2" style={{ color: C.texto }}>{product.variants.label}</p>
              <div className="flex gap-2 flex-wrap">
                {product.variants.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setVariant(opt)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-transform active:scale-95"
                    style={variant === opt ? { backgroundColor: C.rosa, color: "#fff" } : { border: `1px solid ${C.bordaForte}`, color: C.texto }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center rounded-full" style={{ border: `1px solid ${C.bordaForte}` }}>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center" aria-label="Diminuir">
                <Minus size={14} style={{ color: C.texto }} />
              </button>
              <span className="w-6 text-center font-bold text-sm" style={{ color: C.texto }}>{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="w-9 h-9 flex items-center justify-center" aria-label="Aumentar">
                <Plus size={14} style={{ color: C.texto }} />
              </button>
            </div>
            <button
              disabled={disabled}
              onClick={() => {
                onAdd(product, variant, qty)
                onClose()
              }}
              className="flex-1 py-3 rounded-full font-bold text-sm disabled:opacity-40 transition-transform active:scale-[0.98]"
              style={{ backgroundColor: C.rosa, color: "#fff" }}
            >
              {disabled ? "Indisponível" : "Adicionar ao carrinho"}
            </button>
          </div>

          <div className="mt-6 rounded-2xl p-4" style={{ backgroundColor: C.creme }}>
            <p className="text-xs font-bold mb-1" style={{ color: C.texto }}>Precisa de ajuda?</p>
            <p className="text-xs mb-2 leading-relaxed" style={{ color: C.cinza }}>Ficou em dúvida sobre qual escolher? Fale com a gente.</p>
            <a
              href={waLink(`Oi! Tenho uma dúvida sobre o produto "${product.name}" do catálogo da Sra Make Prudente.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full text-white transition-transform active:scale-95"
              style={{ backgroundColor: C.whatsapp }}
            >
              <MessageCircle size={14} /> Falar com a Sra Make no WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
