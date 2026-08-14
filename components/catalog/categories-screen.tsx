"use client"

import { ChevronRight } from "lucide-react"
import { C, CATEGORIES, PRODUCTS } from "@/lib/catalog"
import type { Screen } from "./app"

export function CategoriesScreen({
  setActiveCategory,
  setScreen,
}: {
  setActiveCategory: (id: string) => void
  setScreen: (s: Screen) => void
}) {
  return (
    <div className="px-4 pt-4 pb-6">
      <p className="font-serif font-bold text-xl mb-4" style={{ color: C.texto }}>Categorias</p>
      <div className="flex flex-col gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const count = PRODUCTS.filter((p) => p.category === cat.id).length
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id)
                setScreen("category")
              }}
              className="flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-200 hover:shadow-md active:scale-[0.99]"
              style={{ backgroundColor: "#fff", boxShadow: "var(--shadow-soft)" }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.creme }}>
                <Icon size={22} style={{ color: C.rosaProfundo }} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: C.texto }}>{cat.name}</p>
                <p className="text-xs" style={{ color: C.cinza }}>{count} produtos</p>
              </div>
              <ChevronRight size={18} style={{ color: C.cinza }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
