import Link from "next/link";
import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminLojaPage() {
  const [settings, adminSession] = await Promise.all([prisma.storeSettings.findFirst(), getAdminSession()]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif font-bold text-xl text-texto mb-1">
            Informações da loja
          </h1>
          <p className="text-xs text-cinza">
            Atualize os dados exibidos no catálogo e nos canais de contato.
          </p>
        </div>
        <Link
          href="/admin/loja/vitrine"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rosa/20 bg-white px-3 text-xs font-bold text-rosa-profundo shadow-sm"
        >
          Organizar produtos da Home
        </Link>
      </div>

      <StoreSettingsForm initial={settings} canEditConversionCopy={adminSession?.role === "ADMIN"} />
    </div>
  );
}
