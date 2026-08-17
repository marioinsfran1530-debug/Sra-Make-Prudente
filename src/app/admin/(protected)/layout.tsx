import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAdminSession } from "@/lib/admin-auth";
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

  const adminSession = await getAdminSession();

  if (!adminSession) {
    redirect("/admin/login");
  }

  const email = session.user.email ?? "";

  return (
    <div className="min-h-screen bg-creme">
      <header className="px-6 py-4 border-b border-rosa/20 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-serif font-bold text-texto">
              Sra Make — Painel administrativo
            </p>

            <p className="text-[10px] text-cinza mt-1">
              {email}
            </p>

            <p className="text-[10px] text-cinza mt-0.5">
              {adminSession.role === "ADMIN" ? "Administrador" : "Editor"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-rosa/20 px-4 py-2 text-xs font-bold text-rosa-profundo hover:bg-creme transition"
            >
              Ver catálogo
              <ExternalLink size={14} />
            </Link>

            <LogoutButton />
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 mt-4 rounded-2xl border border-rosa/15 bg-white px-3 py-2 shadow-md text-xs font-bold text-cinza">
          <Link
            href="/admin"
            className="rounded-xl px-3 py-2 hover:bg-rosa/5 hover:text-rosa-profundo transition"
          >
            Dashboard
          </Link>

          <Link
            href="/admin/produtos"
            className="rounded-xl px-3 py-2 hover:bg-rosa/5 hover:text-rosa-profundo transition"
          >
            Produtos
          </Link>

          <Link
            href="/admin/categorias"
            className="rounded-xl px-3 py-2 hover:bg-rosa/5 hover:text-rosa-profundo transition"
          >
            Categorias
          </Link>

          <Link
            href="/admin/pedidos"
            className="rounded-xl px-3 py-2 hover:bg-rosa/5 hover:text-rosa-profundo transition"
          >
            Pedidos
          </Link>

          <Link
            href="/admin/loja"
            className="rounded-xl px-3 py-2 hover:bg-rosa/5 hover:text-rosa-profundo transition"
          >
            Loja
          </Link>

          {adminSession.role === "ADMIN" && (
            <Link
              href="/admin/usuarios"
              className="rounded-xl px-3 py-2 hover:bg-rosa/5 hover:text-rosa-profundo transition"
            >
              Usuários
            </Link>
          )}
        </nav>
      </header>

      <div className="p-6">
        {children}
      </div>
    </div>
  );
}