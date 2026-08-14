"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home as HomeIcon, Grid3x3, Search, ShoppingCart, Store } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Início", icon: HomeIcon },
  { href: "/categoria", label: "Categorias", icon: Grid3x3 },
  { href: "/busca", label: "Buscar", icon: Search },
  { href: "/carrinho", label: "Carrinho", icon: ShoppingCart },
  { href: "/loja", label: "Loja", icon: Store },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-rosa/10 max-w-md mx-auto">
      <div className="flex justify-around items-center py-2">
        {ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px]"
            >
              <Icon
                size={21}
                style={{ color: active ? "#E4127B" : "#7A6C7F", strokeWidth: active ? 2.4 : 2 }}
              />
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
