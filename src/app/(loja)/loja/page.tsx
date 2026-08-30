import type { Metadata } from "next";
import Link from "next/link";
import { getStoreSettings } from "@/lib/data";
import { waLink } from "@/lib/whatsapp";
import { InfoRow } from "@/components/InfoRow";

export const revalidate = 60;

const SITE_URL = "https://www.sramakeprudente.com.br";
const PAGE_URL = `${SITE_URL}/loja`;
const STORE_NAME = "Sra Make Prudente";
const STORE_ADDRESS = "Avenida Brasil, 373 - Box 202, Centro, Presidente Prudente/SP, 19010-031";
const STORE_PHONE = "+55 18 99124-8713";

export const metadata: Metadata = {
  title: "Loja de maquiagem em Presidente Prudente",
  description:
    "Conheça a Sra Make Prudente, loja de maquiagem e cosméticos no Centro de Presidente Prudente/SP. Maquiagem, lash, nail, skincare, acessórios, retirada e entrega.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Sra Make Prudente | Loja de maquiagem e cosméticos",
    description:
      "Loja física e catálogo online de maquiagem, lash, nail, skincare e acessórios em Presidente Prudente/SP.",
    url: PAGE_URL,
    type: "website",
  },
};

function jsonLd(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function LojaInfoPage() {
  const settings = await getStoreSettings();
  const whatsapp = settings?.whatsapp ?? "5518991248713";
  const address = settings?.address || STORE_ADDRESS;
  const mapsUrl =
    settings?.googleMapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const instagram = settings?.instagram ?? "@sramakeprudente";
  const businessHours =
    settings?.businessHours ||
    "Segunda a sexta, 09:00 às 17:00. Sábado, 09:00 às 15:00. Domingo e feriados: atendimento somente online.";

  const aboutStructuredData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${PAGE_URL}#about`,
    url: PAGE_URL,
    name: "Sobre a Sra Make Prudente",
    description:
      "Informações oficiais da Sra Make Prudente, loja de maquiagem e cosméticos em Presidente Prudente/SP.",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#store` },
    inLanguage: "pt-BR",
  };

  const localBusinessStructuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE_URL}/#store`,
    name: STORE_NAME,
    alternateName: "Sra Make",
    url: SITE_URL,
    telephone: STORE_PHONE,
    description:
      "Loja de maquiagem e cosméticos em Presidente Prudente/SP, com produtos para maquiagem, lash, nail, skincare e acessórios de beleza.",
    priceRange: "R$",
    hasMap: mapsUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Avenida Brasil, 373 - Box 202",
      addressLocality: "Presidente Prudente",
      addressRegion: "SP",
      postalCode: "19010-031",
      addressCountry: "BR",
    },
    areaServed: {
      "@type": "City",
      name: "Presidente Prudente",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "17:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "09:00",
        closes: "15:00",
      },
    ],
    sameAs: ["https://www.instagram.com/sramakeprudente/"],
  };

  return (
    <main className="px-4 pt-4 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(aboutStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(localBusinessStructuredData) }}
      />

      <div
        className="rounded-3xl overflow-hidden mb-4 p-6 text-white"
        style={{
          background: "linear-gradient(135deg, #E4127B 0%, #A6157A 55%, #6E1E8C 100%)",
        }}
      >
        <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">
          Loja de maquiagem em Presidente Prudente
        </p>
        <h1 className="font-serif font-bold text-2xl">
          {settings?.storeName ?? STORE_NAME}
        </h1>
        <p className="text-white/85 text-sm mt-2 max-w-2xl">
          Maquiagem, cosméticos, lash, nail, skincare e acessórios de beleza com atendimento personalizado no Centro de Presidente Prudente/SP.
        </p>
      </div>

      <section className="mb-5 rounded-2xl border border-rosa/10 bg-white p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold text-texto">Sobre a Sra Make Prudente</h2>
        <p className="mt-2 text-sm leading-relaxed text-cinza">
          A Sra Make Prudente é uma loja de maquiagem e cosméticos em Presidente Prudente. Atendemos consumidoras e profissionais que procuram produtos para maquiagem, cílios e lash design, nail design, skincare, acessórios e presentes.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-cinza">
          Você pode visitar nossa loja física no Centro, consultar o catálogo online para ver produtos e preços e falar com a equipe pelo WhatsApp para tirar dúvidas, confirmar disponibilidade, combinar retirada ou consultar entrega em Presidente Prudente.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InfoRow
          icon="location"
          title="Endereço"
          text={address}
          action={{ label: "Como chegar", href: mapsUrl }}
          trackKind="location"
        />

        <InfoRow icon="clock" title="Horário da loja física" text={businessHours} />

        <InfoRow
          icon="whatsapp"
          title="WhatsApp"
          text={settings?.whatsapp ?? "(18) 99124-8713"}
          action={{
            label: "Conversar",
            href: waLink("Oi! Vim pelo catálogo da Sra Make Prudente.", whatsapp),
          }}
          whatsapp
          trackKind="whatsapp"
        />

        <InfoRow
          icon="instagram"
          title="Instagram"
          text={instagram}
          action={{
            label: "Seguir",
            href: `https://instagram.com/${instagram.replace("@", "")}`,
          }}
        />

        {settings?.facebook && (
          <InfoRow
            icon="facebook"
            title="Facebook"
            text={settings.facebook}
            action={
              settings.facebook.startsWith("http")
                ? { label: "Acessar", href: settings.facebook }
                : undefined
            }
          />
        )}
      </div>

      <section className="mt-5 rounded-2xl border border-rosa/10 bg-creme p-5">
        <h2 className="font-serif text-lg font-bold text-texto">O que você encontra na Sra Make</h2>
        <p className="mt-2 text-sm leading-relaxed text-cinza">
          Nosso catálogo reúne categorias para diferentes necessidades de beleza e trabalho profissional. A disponibilidade muda conforme o estoque da loja.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            ["Maquiagem", "/categoria/maquiagem"],
            ["Lash Design", "/categoria/lash"],
            ["Nail Design", "/categoria/nail"],
            ["Cosméticos", "/categoria/cosmeticos"],
            ["Acessórios", "/categoria/acessorios"],
            ["Ver todas", "/categoria"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl border border-rosa/10 bg-white px-3 py-3 text-center text-xs font-bold text-rosa-profundo shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-roxo/10 bg-white p-5 shadow-sm">
        <h2 className="font-serif text-lg font-bold text-texto">Atendimento local e online</h2>
        <p className="mt-2 text-sm leading-relaxed text-cinza">
          A loja física funciona de segunda a sexta das 09:00 às 17:00 e aos sábados das 09:00 às 15:00. Aos domingos e feriados, o atendimento é somente online. Para evitar deslocamento desnecessário, você pode confirmar estoque e retirada pelo WhatsApp antes de ir à loja.
        </p>
      </section>
    </main>
  );
}
