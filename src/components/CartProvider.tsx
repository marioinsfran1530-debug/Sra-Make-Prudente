"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { CartItem } from "@/lib/cart-types";
import { trackEvent } from "@/lib/analytics";

const STORAGE_KEY = "sra-make-cart";

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "qty">, qty: number) => void;
  updateQty: (productId: string, variantId: string | null, qty: number) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // localStorage indisponível ou dado corrompido — segue com carrinho vazio
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignora falha de storage
    }
  }, [items, loaded]);

  const addItem = useCallback((item: Omit<CartItem, "qty">, qty: number) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.productId === item.productId && i.variantId === item.variantId
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { ...item, qty }];
    });

    trackEvent("add_to_cart", {
      productId: item.productId,
      variantId: item.variantId,
      variantName: item.variantName,
      name: item.name,
      brand: item.brand,
      category: item.category,
      sku: item.sku,
      qty,
      price: item.price,
    });
  }, []);

  const updateQty = useCallback(
    (productId: string, variantId: string | null, qty: number) => {
      setItems((prev) => {
        if (qty <= 0) {
          return prev.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          );
        }
        return prev.map((i) =>
          i.productId === productId && i.variantId === variantId ? { ...i, qty } : i
        );
      });
    },
    []
  );

  const removeItem = useCallback((productId: string, variantId: string | null) => {
    setItems((prev) => {
      const removed = prev.find((i) => i.productId === productId && i.variantId === variantId);
      if (removed) {
        trackEvent("remove_from_cart", {
          productId: removed.productId,
          variantId: removed.variantId,
          variantName: removed.variantName,
          name: removed.name,
          brand: removed.brand,
          category: removed.category,
          sku: removed.sku,
          qty: removed.qty,
          price: removed.price,
        });
      }
      return prev.filter((i) => !(i.productId === productId && i.variantId === variantId));
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, count, subtotal, addItem, updateQty, removeItem, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return ctx;
}
