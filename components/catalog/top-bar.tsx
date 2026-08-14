"use client"

import { Search, ShoppingCart, ArrowLeft, X } from "lucide-react"
import { C, GRADIENT_HERO } from "@/lib/catalog"
import type { Screen } from "./app"

export function TopBar({
  screen,
  setScreen,
  search,
  setSearch,
  cartCount,
  title,
  onBack,
}: {
  screen: Screen
  setScreen: (s: Screen) => void
  search: string
  setSearch: (s: string) => void
  cartCount: number
  title?: string
  onBack: () => void
}) {
  const showBack = ["cart", "checkout", "store", "category"].includes(screen)
  return (
    <div className="sticky top-0 z-30 backdrop-blur-md" style={{ backgroundColor: "rgba(255,255,255,0.92)", borderBottom: `1px solid ${C.borda}` }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        {showBack ? (
          <button onClick={onBack} className="p-1 -ml-1 transition-transform active:scale-90" aria-label="Voltar">
            <ArrowLeft size={22} style={{ color: C.texto }} />
          </button>
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold text-white flex-shrink-0 shadow-sm"
            style={{ background: GRADIENT_HERO }}
          >
            SM
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-serif font-bold text-base leading-tight truncate" style={{ color: C.texto }}>
            {title || "Sra Make Prudente"}
          </p>
          {!title && <p className="text-[11px]" style={{ color: C.cinza }}>Presidente Prudente/SP</p>}
        </div>
        <button
          onClick={() => setScreen("cart")}
          className="relative p-2 rounded-full transition-transform active:scale-90"
          style={{ backgroundColor: C.creme }}
          aria-label="Abrir carrinho"
        >
          <ShoppingCart size={20} style={{ color: C.rosaProfundo }} />
          {cartCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
              style={{ backgroundColor: C.vermelho }}
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>
      {screen === "home" || screen === "search" ? (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-full px-4 py-2.5 transition-shadow focus-within:shadow-[0_0_0_2px_rgba(228,18,123,0.25)]" style={{ backgroundColor: C.creme }}>
            <Search size={18} style={{ color: C.rosaProfundo }} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                if (screen !== "search") setScreen("search")
              }}
              onFocus={() => setScreen("search")}
              placeholder="Buscar produto, marca ou categoria..."
              className="bg-transparent outline-none text-sm flex-1"
              style={{ color: C.texto }}
              aria-label="Buscar no catálogo"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Limpar busca">
                <X size={16} style={{ color: C.cinza }} />
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
