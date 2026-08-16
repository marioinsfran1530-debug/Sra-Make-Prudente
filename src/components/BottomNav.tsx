"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home as HomeIcon, Grid3x3, Search, ShoppingCart, Store } from "lucide-react";
import { useCart } from "@/components/CartProvider";

const ITEMS = [
  { href: "/", label: "Início", icon: HomeIcon },
  { href: "/categoria", label: "Categorias", icon: Grid3x3 },
  { href: "/busca", label: "Buscar", icon: Search },
  { href: "/carrinho", label: "Carrinho", icon: ShoppingCart },
  { href: "/loja", label: "Loja", icon: Store },
];

export function BottomNav() {
  const pathname = usePathname();
  const { count } = useCart();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-rosa/10">
  <div className="mx-auto flex w-full max-w-7xl justify-around items-center py-2 px-4">
        {ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px] relative"
            >
              <div className="relative">
                <Icon
                  size={21}
                  style={{ color: active ? "#E4127B" : "#7A6C7F", strokeWidth: active ? 2.4 : 2 }}
                />
                {item.href === "/carrinho" && count > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                    style={{ backgroundColor: "#E11D2E" }}
                  >
                    {count}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? "#E4127B" : "#7A6C7F" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
