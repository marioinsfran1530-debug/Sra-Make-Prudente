import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getAdminSession } from "@/lib/admin-auth";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminImageUploadOptimizer } from "@/components/admin/AdminImageUploadOptimizer";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminSession = await getAdminSession();

  if (!adminSession) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-creme">
      <AdminImageUploadOptimizer />

      <header className="border-b border-rosa/20 bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif text-lg font-bold leading-tight text-texto sm:text-base">
              <span className="sm:hidden">Sra Make — Painel</span>
              <span className="hidden sm:inline">Sra Make — Painel administrativo</span>
            </p>

            <p className="mt-1 hidden truncate text-[10px] text-cinza sm:block">
              {adminSession.email}
            </p>

            <p className="mt-0.5 text-[10px] text-cinza">
              {adminSession.role === "ADMIN" ? "Administrador" : "Editor"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/?preview=admin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-full border border-rosa/20 px-3 py-2 text-[11px] font-bold text-rosa-profundo transition hover:bg-creme sm:gap-1.5 sm:px-4 sm:text-xs"
            >
              <span className="sm:hidden">Catálogo</span>
              <span className="hidden sm:inline">Ver catálogo</span>
              <ExternalLink size={13} />
            </Link>

            <LogoutButton />
          </div>
        </div>

        <AdminNav isAdmin={adminSession.role === "ADMIN"} />
      </header>

      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}
