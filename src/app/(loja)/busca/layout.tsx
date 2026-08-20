import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buscar produtos",
  robots: {
    index: false,
    follow: true,
  },
};

export default function BuscaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
