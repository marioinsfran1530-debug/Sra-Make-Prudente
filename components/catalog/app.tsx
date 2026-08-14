"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Check } from "lucide-react"
import { C, CATEGORIES, PRODUCTS, type Product, type CartItem } from "@/lib/catalog"
import { TopBar } from "./top-bar"
import { BottomNav } from "./bottom-nav"
import { Home } from "./home"
import { CategoriesScreen } from "./categories-screen"
import { ProductListScreen } from "./product-list-screen"
import { SearchScreen } from "./search-screen"
import { CartScreen } from "./cart-screen"
import { CheckoutScreen } from "./checkout-screen"
import { StoreScreen } from "./store-screen"
import { ProductModal } from "./product-modal"

export type Screen = "home" | "categories" | "category" | "search" | "cart" | "checkout" | "store"

const CART_KEY = "sra-make-cart"

export default function App() {
  const [screen, setScreen] = useState<Screen>("home")
  const [activeCategory, setActiveCategory] = useState("make")
  const [search, setSearch] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // carrega carrinho persistido
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY)
      if (raw) setCart(JSON.parse(raw))
    } catch {
      // sem carrinho salvo ainda
    }
    setLoaded(true)
  }, [])

  // persiste carrinho ao mudar
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart))
    } catch {
      // ignora erros de storage
    }
  }, [cart, loaded])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1800)
  }, [])

  const addToCart = useCallback(
    (product: Product, variant: string | null, qty: number) => {
      setCart((prev) => {
        const idx = prev.findIndex((c) => c.productId === product.id && c.variant === variant)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { ...next[idx], qty: next[idx].qty + qty }
          return next
        }
        return [...prev, { productId: product.id, variant, qty }]
      })
      showToast("Adicionado ao carrinho")
    },
    [showToast],
  )

  const updateQty = useCallback((productId: string, variant: string | null, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((c) => !(c.productId === productId && c.variant === variant))
      return prev.map((c) => (c.productId === productId && c.variant === variant ? { ...c, qty } : c))
    })
  }, [])

  const removeItem = useCallback((productId: string, variant: string | null) => {
    setCart((prev) => prev.filter((c) => !(c.productId === productId && c.variant === variant)))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0)

  const categoryProducts = useMemo(() => PRODUCTS.filter((p) => p.category === activeCategory), [activeCategory])
  const categoryMeta = CATEGORIES.find((c) => c.id === activeCategory)

  const titles: Partial<Record<Screen, string | undefined>> = {
    category: categoryMeta?.name,
    cart: "Carrinho",
    checkout: "Finalizar pedido",
    store: "A loja",
    categories: "Categorias",
    search: "Buscar",
  }

  const handleBack = () => {
    if (screen === "checkout") setScreen("cart")
    else if (screen === "category") setScreen("categories")
    else setScreen("home")
  }

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ backgroundColor: C.creme }}>
      <div className="w-full max-w-md min-h-screen relative" style={{ backgroundColor: C.creme }}>
        <TopBar
          screen={screen}
          setScreen={setScreen}
          search={search}
          setSearch={setSearch}
          cartCount={cartCount}
          title={titles[screen]}
          onBack={handleBack}
        />

        <div>
          {screen === "home" && (
            <Home setScreen={setScreen} setActiveCategory={setActiveCategory} cart={cart} onAdd={addToCart} onOpen={setSelectedProduct} />
          )}
          {screen === "categories" && <CategoriesScreen setActiveCategory={setActiveCategory} setScreen={setScreen} />}
          {screen === "category" && (
            <ProductListScreen products={categoryProducts} cart={cart} onAdd={addToCart} onOpen={setSelectedProduct} subOptions={categoryMeta?.sub} />
          )}
          {screen === "search" && <SearchScreen search={search} cart={cart} onAdd={addToCart} onOpen={setSelectedProduct} />}
          {screen === "cart" && <CartScreen cart={cart} updateQty={updateQty} removeItem={removeItem} setScreen={setScreen} />}
          {screen === "checkout" && <CheckoutScreen cart={cart} setScreen={setScreen} clearCart={clearCart} />}
          {screen === "store" && <StoreScreen />}
        </div>

        <div className="h-16" />
        <BottomNav screen={screen} setScreen={setScreen} cartCount={cartCount} />

        {selectedProduct && (
          <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />
        )}

        {toast && (
          <div
            className="fixed left-1/2 bottom-24 z-50 px-4 py-2.5 rounded-full flex items-center gap-2 text-white text-sm font-semibold animate-toast-up"
            style={{ backgroundColor: C.navy }}
          >
            <Check size={16} style={{ color: C.dourado }} /> {toast}
          </div>
        )}
      </div>
    </div>
  )
}
