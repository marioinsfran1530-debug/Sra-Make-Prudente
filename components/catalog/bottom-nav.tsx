"use client"

import { Home as HomeIcon, Grid3x3, Search, ShoppingCart, Store, type LucideIcon } from "lucide-react"
import { C } from "@/lib/catalog"
import type { Screen } from "./app"

interface NavItem {
  id: Screen
  label: string
  icon: LucideIcon
  count?: number
}

export function BottomNav({
  screen,
  setScreen,
  cartCount,
}: {
  screen: Screen
  setScreen: (s: Screen) => void
  cartCount: number
}) {
  const items: NavItem[] = [
    { id: "home", label: "Início", icon: HomeIcon },
    { id: "categories", label: "Categorias", icon: Grid3x3 },
    { id: "search", label: "Buscar", icon: Search },
    { id: "cart", label: "Carrinho", icon: ShoppingCart, count: cartCount },
    { id: "store", label: "Loja", icon: Store },
  ]
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-md" style={{ backgroundColor: "rgba(255,255,255,0.94)", borderTop: `1px solid ${C.borda}` }}>
      <div className="flex justify-around items-center py-2 max-w-md mx-auto">
        {items.map((it) => {
          const active = screen === it.id || (it.id === "categories" && screen === "category")
          const Icon = it.icon
          return (
            <button
              key={it.id}
              onClick={() => setScreen(it.id)}
              className="flex flex-col items-center gap-0.5 px-2 py-1 relative min-w-[56px] transition-transform active:scale-90"
            >
              <div className="relative">
                <Icon size={21} style={{ color: active ? C.rosa : C.cinza, strokeWidth: active ? 2.4 : 2 }} />
                {it.count ? (
                  <span
                    className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                    style={{ backgroundColor: C.vermelho }}
                  >
                    {it.count}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium" style={{ color: active ? C.rosa : C.cinza }}>{it.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
