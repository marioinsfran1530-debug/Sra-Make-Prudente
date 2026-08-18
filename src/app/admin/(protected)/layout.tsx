import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAdminSession } from "@/lib/admin-auth";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { AdminNav } from "@/components/admin/AdminNav";

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

        <AdminNav
          isAdmin={adminSession.role === "ADMIN"}
        />
      </header>

      <div className="p-6">
        {children}
      </div>
    </div>
  );
}