import { BottomNav } from "@/components/BottomNav";
import { CartProvider } from "@/components/CartProvider";
import { DesktopStoreNav } from "@/components/DesktopStoreNav";
import { StoreFooter } from "@/components/StoreFooter";
import { StoreScrollReveal } from "@/components/StoreScrollReveal";
import { TrackingInit } from "@/components/TrackingInit";
import { getStoreSettings } from "@/lib/data";

const SITE_URL = "https://sramakeprudente.com.br";
const STORE_CNPJ = process.env.NEXT_PUBLIC_STORE_CNPJ || "64.394.637/0001-92";

function socialUrl(value: string | null | undefined, network: "instagram" | "facebook") {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    const handle = trimmed.replace(/^@/, "").replace(/^\/+|\/+$/g, "");
    if (!handle || handle.includes(" ")) return null;
    return `https://${network}.com/${handle}`;
  }
}

function phoneForSchema(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
}

export default async function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getStoreSettings();
  const storeName = settings?.storeName ?? "Sra Make Prudente";
  const telephone = phoneForSchema(settings?.whatsapp);

  const sameAs = [
    socialUrl(settings?.instagram, "instagram"),
    socialUrl(settings?.facebook, "facebook"),
  ].filter((url): url is string => Boolean(url));

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: storeName,
        alternateName: "Sra Make",
        inLanguage: "pt-BR",
        publisher: { "@id": `${SITE_URL}/#store` },
      },
      {
        "@type": ["Store", "LocalBusiness"],
        "@id": `${SITE_URL}/#store`,
        name: storeName,
        url: SITE_URL,
        taxID: STORE_CNPJ,
        description:
          "Loja de maquiagem, lash, nail e acessórios em Presidente Prudente, com catálogo online, retirada e atendimento pelo WhatsApp.",
        areaServed: {
          "@type": "City",
          name: "Presidente Prudente",
          containedInPlace: {
            "@type": "State",
            name: "São Paulo",
          },
        },
        ...(settings?.logoUrl ? { logo: settings.logoUrl, image: settings.logoUrl } : {}),
        ...(telephone
          ? {
              telephone,
              contactPoint: {
                "@type": "ContactPoint",
                telephone,
                contactType: "customer service",
                areaServed: "BR",
                availableLanguage: "Portuguese",
              },
            }
          : {}),
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
      },
    ],
  };

  const structuredDataJson = JSON.stringify(structuredData).replace(/</g, "\\u003c");

  return (
    <CartProvider>
      <TrackingInit />
      <StoreScrollReveal />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredDataJson }}
      />

      <div className="min-h-screen bg-creme">
        <div className="mx-auto min-h-screen w-full max-w-7xl bg-creme relative">
          <DesktopStoreNav
            storeName={storeName}
            logoUrl={settings?.logoUrl}
          />
          <div className="pb-20">
            {children}
            <StoreFooter storeName={storeName} cnpj={STORE_CNPJ} />
          </div>
          <BottomNav />
        </div>
      </div>
    </CartProvider>
  );
}
