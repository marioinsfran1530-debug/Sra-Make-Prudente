// Layout da loja pública. Fase 2 vai adicionar header, busca e bottom nav aqui.
export default function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen max-w-md mx-auto bg-creme">{children}</div>;
}
