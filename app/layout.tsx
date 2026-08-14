import type { Metadata, Viewport } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["600", "700", "800"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Sra Make Prudente — Catálogo",
  description:
    "Catálogo de maquiagem, lash, nail e acessórios da Sra Make Prudente. Escolha pelo app e confirme o pedido pelo WhatsApp. Presidente Prudente/SP.",
  keywords: ["maquiagem", "lash", "nail", "cosméticos", "Presidente Prudente", "Sra Make"],
  openGraph: {
    title: "Sra Make Prudente — Catálogo",
    description: "Maquiagem, lash, nail e acessórios. Escolha pelo app e confirme pelo WhatsApp.",
    type: "website",
  },
}

export const viewport: Viewport = {
  themeColor: "#e4127b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable} bg-creme`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
