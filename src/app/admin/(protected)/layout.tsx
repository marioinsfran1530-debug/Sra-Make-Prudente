import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { LogoutButton } from "@/components/admin/LogoutButton";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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

  const email = session.user.email ?? "";

  return (
    <div className="min-h-screen bg-creme">
      <header className="px-6 py-4 border-b border-rosa/20 bg-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-serif font-bold text-texto">
              Sra Make — Painel administrativo
            </p>

            <p className="text-[10px] text-cinza mt-1">
              {email}
            </p>
          </div>

          <LogoutButton />
        </div>

        <nav className="flex gap-4 mt-4 text-xs font-bold text-cinza">
          <Link
            href="/admin"
            className="hover:text-rosa-profundo"
          >
            Dashboard
          </Link>

          <Link
            href="/admin/produtos"
            className="hover:text-rosa-profundo"
          >
            Produtos
          </Link>

          <Link
            href="/admin/categorias"
            className="hover:text-rosa-profundo"
          >
            Categorias
          </Link>

          <Link
            href="/admin/pedidos"
            className="hover:text-rosa-profundo"
          >
            Pedidos
          </Link>
        </nav>
      </header>

      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
