import { StoreAccountButton } from "@/components/StoreAccountButton";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { CartProvider } from "@/components/CartProvider";
import { CartCountBadge } from "@/components/CartCountBadge";
import { TrackingInit } from "@/components/TrackingInit";
import { getStoreSettings } from "@/lib/data";

export default async function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getStoreSettings();

  return (
    <CartProvider>
      <TrackingInit />

      <div className="min-h-screen bg-creme">
        <div className="mx-auto min-h-screen w-full max-w-7xl bg-creme relative">
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-rosa/10">
            <div className="flex items-center gap-3 px-4 py-3">
              <Link
                href="/"
                className="flex-1 min-w-0 font-serif font-bold text-sm text-texto truncate"
              >
                {settings?.storeName ?? "Sra Make Prudente"}
              </Link>

              <StoreAccountButton />

              <Link
                href="/carrinho"
                className="relative p-2 rounded-full bg-creme"
                aria-label="Abrir carrinho"
              >
                <ShoppingCart size={20} className="text-rosa-profundo" />
                <CartCountBadge />
              </Link>
            </div>
          </div>

          <div className="pb-20">{children}</div>

          <BottomNav />
        </div>
      </div>
    </CartProvider>
  );
}
