import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { CartProvider } from "@/components/CartProvider";
import { CartCountBadge } from "@/components/CartCountBadge";
import { TrackingInit } from "@/components/TrackingInit";

export default function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <TrackingInit />
      <div className="min-h-screen max-w-md mx-auto bg-creme relative">
        <div className="sticky top-0 z-20 bg-white border-b border-rosa/10">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <Link href="/" className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold text-white flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #E4127B 0%, #A6157A 55%, #6E1E8C 100%)",
                }}
              >
                SM
              </div>
              <div className="min-w-0">
                <p className="font-serif font-bold text-sm leading-tight truncate text-texto">
                  Sra Make Prudente
                </p>
                <p className="text-[11px] text-cinza">Presidente Prudente/SP</p>
              </div>
            </Link>
            <Link href="/carrinho" className="relative p-2 rounded-full bg-creme">
              <ShoppingCart size={20} className="text-rosa-profundo" />
              <CartCountBadge />
            </Link>
          </div>
        </div>

        <div className="pb-20">{children}</div>

        <BottomNav />
      </div>
    </CartProvider>
  );
}
