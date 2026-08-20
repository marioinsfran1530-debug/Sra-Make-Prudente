import { BottomNav } from "@/components/BottomNav";
import { CartProvider } from "@/components/CartProvider";
import { DesktopStoreNav } from "@/components/DesktopStoreNav";
import { TrackingInit } from "@/components/TrackingInit";
import { getStoreSettings } from "@/lib/data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sramakeprudente.com.br";

function absoluteSocialUrl(value?: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getStoreSettings();
  const storeName = settings?.storeName ?? "Sra Make Prudente";

  const sameAs = [
    absoluteSocialUrl(settings?.instagram),
    absoluteSocialUrl(settings?.facebook),
  ].filter((url): url is string => Boolean(url));

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": ["Store", "LocalBusiness"],
    "@id": `${SITE_URL}/#store`,
    name: storeName,
    url: SITE_URL,
    ...(settings?.logoUrl ? { logo: settings.logoUrl, image: settings.logoUrl } : {}),
    ...(settings?.whatsapp ? { telephone: settings.whatsapp } : {}),
    ...(settings?.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: settings.address,
            addressLocality: "Presidente Prudente",
            addressRegion: "SP",
            addressCountry: "BR",
          },
        }
      : {}),
    ...(settings?.googleMapsUrl ? { hasMap: settings.googleMapsUrl } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  const localBusinessJson = JSON.stringify(localBusiness).replace(/</g, "\\u003c");

  return (
    <CartProvider>
      <TrackingInit />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: localBusinessJson }}
      />

      <div className="min-h-screen bg-creme">
        <div className="mx-auto min-h-screen w-full max-w-7xl bg-creme relative">
          <DesktopStoreNav
            storeName={storeName}
            logoUrl={settings?.logoUrl}
          />
          <div className="pb-20">{children}</div>
          <BottomNav />
        </div>
      </div>
    </CartProvider>
  );
}
