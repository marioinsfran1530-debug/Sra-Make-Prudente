import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sramakeprudente.com.br";

export const metadata: Metadata = {
  title: "Loja de Maquiagem em Presidente Prudente",
  description:
    "Conheça a Sra Make Prudente em Presidente Prudente. Consulte endereço, horário, WhatsApp e como chegar à loja física.",
  alternates: {
    canonical: "/loja",
  },
  openGraph: {
    title: "Sra Make Prudente | Loja de Maquiagem em Presidente Prudente",
    description:
      "Endereço, horário e atendimento da Sra Make Prudente em Presidente Prudente.",
    url: `${SITE_URL}/loja`,
    type: "website",
  },
};

export default function LojaInfoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
