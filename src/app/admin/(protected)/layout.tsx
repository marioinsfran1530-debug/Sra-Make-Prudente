import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase";

// Regra do plano (seção 3): o middleware já protege /admin/*, mas cada
// camada valida a sessão de novo no servidor — nunca confiar só na
// proteção visual do frontend.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-creme">
      <header className="px-6 py-4 border-b border-rosa/20 bg-white">
        <p className="font-serif font-bold text-texto mb-2">
          Sra Make — Painel administrativo
        </p>
        <nav className="flex gap-4 text-xs font-bold text-cinza">
          <Link href="/admin" className="hover:text-rosa-profundo">Dashboard</Link>
          <Link href="/admin/produtos" className="hover:text-rosa-profundo">Produtos</Link>
          <Link href="/admin/categorias" className="hover:text-rosa-profundo">Categorias</Link>
          <Link href="/admin/pedidos" className="hover:text-rosa-profundo">Pedidos</Link>
        </nav>
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}
