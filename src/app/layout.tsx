import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { PwaLaunchPreserver } from "@/components/PwaLaunchPreserver";
import "./globals.css";

const SITE_URL = "https://www.sramakeprudente.com.br";
const TITLE = "Sra Make Prudente | Maquiagem, Lash, Nail e Cosméticos";
const DESCRIPTION =
  "Loja de maquiagem e cosméticos em Presidente Prudente/SP. Encontre maquiagem, lash, nail, skincare e acessórios, com atendimento personalizado, retirada e entrega.";
const SOCIAL_IMAGE_URL = `${SITE_URL}/icon-512.png`;
const GA_MEASUREMENT_ID = "G-60T57RTWD1";

function jsonLd(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Sra Make Prudente",
  },
  description: DESCRIPTION,
  applicationName: "Sra Make Prudente",
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  verification: {
    google: "waC6jBl3IyhXL_nQhs90X6YCZYUie2RXV0MT9EAXA9Y",
  },
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Sra Make Prudente",
    locale: "pt_BR",
    type: "website",
    images: [{ url: SOCIAL_IMAGE_URL, width: 512, height: 512, alt: "Sra Make Prudente" }],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: [SOCIAL_IMAGE_URL],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#E4127B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeStructuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE_URL}/#store`,
    name: "Sra Make Prudente",
    legalName: "Sra Make Prudente",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    image: `${SITE_URL}/icon-512.png`,
    description: DESCRIPTION,
    telephone: "+55 18 99124-8713",
    priceRange: "R$",
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
    knowsAbout: [
      "Maquiagem",
      "Cosméticos",
      "Lash",
      "Cílios",
      "Nail",
      "Unhas",
      "Skincare",
      "Acessórios de beleza",
    ],
  };

  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "Sra Make Prudente",
    inLanguage: "pt-BR",
    publisher: { "@id": `${SITE_URL}/#store` },
  };

  return (
    <html lang="pt-BR">
      <body>
        <PwaLaunchPreserver />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(storeStructuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(websiteStructuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
