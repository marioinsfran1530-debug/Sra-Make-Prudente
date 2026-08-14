"use client"

import type { ReactNode } from "react"
import { Sparkles, Search, MessageCircle } from "lucide-react"
import { C, GRADIENT_IMG, waLink, type Product, type Stock } from "@/lib/catalog"

/* ProductImage — placeholder elegante com iniciais do produto */
export function ProductImage({ product, className = "" }: { product: Product; className?: string }) {
  const initials = product.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
  return (
    <div
      className={`flex items-center justify-center relative overflow-hidden ${className}`}
      style={{ background: GRADIENT_IMG }}
    >
      <span className="font-serif" style={{ color: C.rosaProfundo, opacity: 0.5, fontSize: "1.6rem", fontWeight: 700 }}>
        {initials}
      </span>
      <Sparkles className="absolute" style={{ color: C.dourado, opacity: 0.35, width: 16, height: 16, top: 8, right: 10 }} />
    </div>
  )
}

type Tone = "rosa" | "dourado" | "navy" | "vermelho" | "outline"

export function Badge({ children, tone = "rosa" }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<Tone, { bg: string; color: string; border?: string }> = {
    rosa: { bg: C.rosa, color: "#fff" },
    dourado: { bg: C.dourado, color: "#fff" },
    navy: { bg: C.navy, color: "#fff" },
    vermelho: { bg: "#FCE4E7", color: C.vermelho },
    outline: { bg: "#fff", color: C.rosaProfundo, border: `1px solid ${C.rosa}` },
  }
  const t = tones[tone]
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full inline-block"
      style={{ backgroundColor: t.bg, color: t.color, border: t.border }}
    >
      {children}
    </span>
  )
}

export function StockLabel({ stock }: { stock: Stock }) {
  if (stock === "indisponivel")
    return <span className="text-xs font-semibold" style={{ color: C.vermelho }}>Indisponível</span>
  if (stock === "ultimas")
    return <span className="text-xs font-semibold" style={{ color: C.dourado }}>Últimas unidades</span>
  return <span className="text-xs font-medium" style={{ color: C.verde }}>Disponível</span>
}

export function Chip({
  children,
  active,
  onClick,
  small,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  small?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 rounded-full font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
        small ? "px-3 py-1 text-[11px]" : "px-4 py-1.5 text-xs"
      }`}
      style={active ? { backgroundColor: C.rosa, color: "#fff" } : { backgroundColor: "#fff", color: C.texto, border: `1px solid ${C.bordaForte}` }}
    >
      {children}
    </button>
  )
}

export function EmptyState({ hint }: { hint?: string }) {
  return (
    <div className="flex flex-col items-center text-center px-8 py-12 animate-fade-in">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: C.creme }}>
        <Search size={26} style={{ color: C.rosaProfundo }} />
      </div>
      <p className="font-bold text-sm mb-1" style={{ color: C.texto }}>Não encontrou o que procura?</p>
      <p className="text-xs mb-4 leading-relaxed" style={{ color: C.cinza }}>
        {hint || "Manda uma foto ou o nome do produto que a gente confirma pra você."}
      </p>
      <a
        href={waLink("Oi! Não encontrei o produto que eu queria no catálogo. Pode me ajudar?")}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-full text-white transition-transform active:scale-95"
        style={{ backgroundColor: C.whatsapp }}
      >
        <MessageCircle size={15} /> Mandar foto no WhatsApp
      </a>
    </div>
  )
}
