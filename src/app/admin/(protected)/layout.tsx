import { redirect } from "next/navigation";
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
        <p className="font-serif font-bold text-texto">
          Sra Make — Painel administrativo
        </p>
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}
