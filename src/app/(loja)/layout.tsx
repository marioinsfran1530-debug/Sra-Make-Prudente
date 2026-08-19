import { BottomNav } from "@/components/BottomNav";
import { CartProvider } from "@/components/CartProvider";
import { TrackingInit } from "@/components/TrackingInit";

export default function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <TrackingInit />

      <div className="min-h-screen bg-creme">
        <div className="mx-auto min-h-screen w-full max-w-7xl bg-creme relative">
          <div className="pb-20">{children}</div>
          <BottomNav />
        </div>
      </div>
    </CartProvider>
  );
}
