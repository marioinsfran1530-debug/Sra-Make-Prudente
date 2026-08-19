"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3x3, ShoppingCart, Store } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { StoreAccountButton } from "@/components/StoreAccountButton";

export function DesktopStoreNav({
  storeName,
  logoUrl,
}: {
  storeName: string;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const { count } = useCart();

  if (pathname === "/") return null;

  const items = [
    { href: "/", label: "Início", icon: Home },
    { href: "/categoria", label: "Categorias", icon: Grid3x3 },
    { href: "/carrinho", label: "Carrinho", icon: ShoppingCart },
    { href: "/loja", label: "Loja", icon: Store },
  ];

  return (
    <div className="hidden md:block px-4 pt-4">
      <nav className="flex items-center gap-4 rounded-2xl border border-rosa/10 bg-white px-4 py-3 shadow-sm">
        <Link href="/" className="flex min-w-0 items-center gap-3 mr-auto">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-rosa/15 bg-creme flex items-center justify-center font-serif font-bold text-rosa-profundo">
            {logoUrl ? (
              <img src={logoUrl} alt={`Logo ${storeName}`} className="h-full w-full object-contain bg-white" />
            ) : (
              "SM"
            )}
          </div>
          <span className="truncate font-serif text-sm font-bold text-texto">{storeName}</span>
        </Link>

        <div className="flex items-center gap-1">
          {items.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  active ? "bg-creme text-rosa-profundo" : "text-cinza hover:bg-creme hover:text-texto"
                }`}
              >
                <Icon size={16} />
                {item.label}
                {item.href === "/carrinho" && count > 0 && (
                  <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-[#E11D2E] text-[9px] text-white flex items-center justify-center">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
          <div className="ml-1">
            <StoreAccountButton />
          </div>
        </div>
      </nav>
    </div>
  );
}
