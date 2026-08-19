import { BottomNav } from "@/components/BottomNav";
import { CartProvider } from "@/components/CartProvider";
import { DesktopStoreNav } from "@/components/DesktopStoreNav";
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
          <DesktopStoreNav
            storeName={settings?.storeName ?? "Sra Make Prudente"}
            logoUrl={settings?.logoUrl}
          />
          <div className="pb-20 md:pb-8">{children}</div>
          <BottomNav />
        </div>
      </div>
    </CartProvider>
  );
}
