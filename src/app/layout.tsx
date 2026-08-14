import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sra Make Prudente | Maquiagem, Lash, Nail e Cosméticos",
  description:
    "Confira o catálogo da Sra Make Prudente. Maquiagem, produtos para lash, nail e acessórios em Presidente Prudente. Escolha seus produtos e faça seu pedido pelo WhatsApp.",
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
