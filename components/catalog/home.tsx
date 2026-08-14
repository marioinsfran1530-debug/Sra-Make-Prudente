"use client"

import { Sparkles, Search, MessageCircle, Truck, Package, Camera, MapPin } from "lucide-react"
import {
  C, GRADIENT_HERO, PRODUCTS, CATEGORIES, STORE_ADDRESS, MAPS_URL, waLink,
  type Product, type CartItem,
} from "@/lib/catalog"
import { ProductCard } from "./product-card"
import type { Screen } from "./app"

function Section({
  title,
  products,
  onAdd,
  onOpen,
  cartQty,
}: {
  title: string
  products: Product[]
  onAdd: (p: Product, v: string | null, q: number) => void
  onOpen: (p: Product) => void
  cartQty: (id: string, variant: string | null) => number
}) {
  if (!products.length) return null
  return (
    <div className="mt-8">
      <p className="font-serif font-bold text-lg mb-3 px-4" style={{ color: C.texto }}>{title}</p>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
        {products.map((p) => (
          <div key={p.id} className="w-40 flex-shrink-0">
            <ProductCard product={p} qtyInCart={cartQty(p.id, null)} onAdd={onAdd} onOpen={onOpen} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function Home({
  setScreen,
  setActiveCategory,
  cart,
  onAdd,
  onOpen,
}: {
  setScreen: (s: Screen) => void
  setActiveCategory: (id: string) => void
  cart: CartItem[]
  onAdd: (p: Product, v: string | null, q: number) => void
  onOpen: (p: Product) => void
}) {
  const news = PRODUCTS.filter((p) => p.isNew)
  const cartQty = (id: string, variant: string | null) => {
    const item = cart.find((c) => c.productId === id && c.variant === variant)
    return item ? item.qty : 0
  }

  return (
    <div className="pb-6">
      {/* Hero */}
      <div className="mx-4 mt-3 rounded-3xl overflow-hidden relative animate-rise" style={{ background: GRADIENT_HERO }}>
        <div className="p-6 relative z-10">
          <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-2">Catálogo Sra Make</p>
          <h1 className="text-white font-serif font-bold text-2xl leading-tight mb-2 text-balance">
            Encontre o que você precisa na Sra Make.
          </h1>
          <p className="text-white/85 text-sm mb-4 leading-relaxed">
            Maquiagem, lash, nail e acessórios. Escolha pelo catálogo e confirme pelo WhatsApp.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setScreen("categories")}
              className="px-4 py-2.5 rounded-full text-sm font-bold transition-transform active:scale-95"
              style={{ backgroundColor: "#fff", color: C.rosaProfundo }}
            >
              Ver produtos
            </button>
            <a
              href={waLink("Oi! Vim pelo catálogo da Sra Make Prudente e preciso de ajuda para escolher um produto.")}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-full text-sm font-bold border border-white/70 text-white flex items-center gap-1 transition-transform active:scale-95"
            >
              Preciso de ajuda
            </a>
          </div>
        </div>
        <Sparkles className="absolute text-white/20" style={{ width: 90, height: 90, right: -10, bottom: -10 }} />
      </div>

      {/* Demo notice */}
      <div className="mx-4 mt-3 px-3 py-2 rounded-xl text-[11px]" style={{ backgroundColor: "#FBEFF4", color: C.rosaProfundo }}>
        Catálogo de demonstração — produtos ilustrativos para teste do aplicativo.
      </div>

      {/* Categorias */}
      <div className="mt-6 px-4">
        <p className="font-serif font-bold text-lg mb-3" style={{ color: C.texto }}>O que você procura hoje?</p>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  setScreen("category")
                }}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:shadow-md group-active:scale-95"
                  style={{ backgroundColor: C.creme }}
                >
                  <Icon size={24} style={{ color: C.rosaProfundo }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: C.texto }}>{cat.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Atalhos */}
      <div className="mt-6 px-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={{ backgroundColor: C.creme }}>
          <p className="text-xs font-bold" style={{ color: C.rosaProfundo }}>Para você</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: C.texto }}>Encontre seu próximo produto de beleza sem complicação.</p>
        </div>
        <div className="rounded-2xl p-4" style={{ backgroundColor: "#F1ECF7" }}>
          <p className="text-xs font-bold" style={{ color: C.roxo }}>Para seu trabalho</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: C.texto }}>Precisa repor material? Encontre rápido e confirme no WhatsApp.</p>
        </div>
      </div>

      {/* Mais procurados */}
      <Section title="Mais procurados" products={PRODUCTS.filter((p) => p.bestSeller)} onAdd={onAdd} onOpen={onOpen} cartQty={cartQty} />

      {/* Novidades */}
      <Section title="Novidades" products={news} onAdd={onAdd} onOpen={onOpen} cartQty={cartQty} />

      {/* Reposição rápida */}
      <div className="mt-8 mx-4 rounded-2xl p-5 flex items-center gap-4" style={{ backgroundColor: C.navy }}>
        <Package size={30} style={{ color: C.dourado }} className="flex-shrink-0" />
        <div className="flex-1">
          <p className="font-serif font-bold text-white text-sm mb-1">Precisa repor?</p>
          <p className="text-white/70 text-xs mb-2 leading-relaxed">Manda o nome ou uma foto do produto e a gente confirma se temos disponível.</p>
          <a
            href={waLink("Oi! Preciso repor um material e queria confirmar disponibilidade. Vim pelo catálogo da Sra Make Prudente.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-transform active:scale-95"
            style={{ backgroundColor: C.dourado, color: C.navy }}
          >
            <Camera size={13} /> Mandar no WhatsApp
          </a>
        </div>
      </div>

      {/* Benefícios */}
      <div className="mt-8 px-4">
        <p className="font-serif font-bold text-lg mb-3" style={{ color: C.texto }}>Comprar ficou mais fácil.</p>
        <div className="flex gap-3">
          {[
            { icon: Search, text: "Você escolhe" },
            { icon: MessageCircle, text: "A gente confirma" },
            { icon: Truck, text: "Você recebe ou retira" },
          ].map((s, i) => (
            <div key={i} className="flex-1 rounded-2xl p-3 text-center" style={{ backgroundColor: C.creme }}>
              <s.icon size={20} style={{ color: C.rosaProfundo }} className="mx-auto mb-1" />
              <p className="text-[11px] font-semibold" style={{ color: C.texto }}>{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Localização */}
      <div className="mt-8 mx-4 rounded-2xl p-5" style={{ border: `1px solid ${C.borda}` }}>
        <p className="font-serif font-bold text-sm mb-1" style={{ color: C.texto }}>Prefere retirar?</p>
        <p className="text-xs mb-3 leading-relaxed" style={{ color: C.cinza }}>{STORE_ADDRESS}</p>
        <div className="flex gap-2">
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 transition-transform active:scale-95"
            style={{ backgroundColor: C.creme, color: C.rosaProfundo }}
          >
            <MapPin size={14} /> Como chegar
          </a>
          <a
            href={waLink("Oi! Vim pelo catálogo da Sra Make Prudente.")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 text-white transition-transform active:scale-95"
            style={{ backgroundColor: C.whatsapp }}
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
