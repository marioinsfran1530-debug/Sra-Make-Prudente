"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home as HomeIcon,
  Grid3x3,
  ShoppingCart,
  Store,
} from "lucide-react";
import { useCart } from "@/components/CartProvider";

const ITEMS = [
  { href: "/", label: "Início", icon: HomeIcon },
  { href: "/categoria", label: "Produtos", icon: Grid3x3 },
  { href: "/carrinho", label: "Carrinho", icon: ShoppingCart },
  { href: "/loja", label: "Loja", icon: Store },
];

export function BottomNav() {
  const pathname = usePathname();
  const { count } = useCart();

  return (
    <nav
      aria-label="Atalhos principais"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-rosa/10 bg-white shadow-[0_-4px_18px_rgba(35,20,42,0.05)]"
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-4 items-center px-4 py-2">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center gap-0.5 py-1 transition hover:bg-creme/60 md:rounded-xl"
            >
              <div className="relative">
                <Icon
                  size={21}
                  style={{
                    color: active ? "#E4127B" : "#7A6C7F",
                    strokeWidth: active ? 2.4 : 2,
                  }}
                />
                {item.href === "/carrinho" && count > 0 && (
                  <span
                    className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                    style={{ backgroundColor: "#E11D2E" }}
                  >
                    {count}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium md:text-[11px]"
                style={{ color: active ? "#E4127B" : "#7A6C7F" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
