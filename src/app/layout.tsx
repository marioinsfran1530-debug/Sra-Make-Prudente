import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sramakeprudente.vercel.app";
const TITLE = "Sra Make Prudente | Maquiagem, Lash, Nail e Cosméticos";
const DESCRIPTION =
  "Confira o catálogo da Sra Make Prudente. Maquiagem, produtos para lash, nail e acessórios em Presidente Prudente. Escolha seus produtos e faça seu pedido pelo WhatsApp.";
const SOCIAL_IMAGE_URL = `${SITE_URL}/icon-512.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Sra Make Prudente",
  },
  description: DESCRIPTION,
  applicationName: "Sra Make Prudente",
  manifest: "/manifest.webmanifest",
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
  robots: { index: true, follow: true },
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
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
