import { prisma } from "@/lib/prisma";
import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminLojaPage() {
  const [settings, adminSession] = await Promise.all([prisma.storeSettings.findFirst(), getAdminSession()]);

  return (
    <div>
      <h1 className="font-serif font-bold text-xl text-texto mb-1">
        Informações da loja
      </h1>

      <p className="text-xs text-cinza mb-4">
        Atualize os dados exibidos no catálogo e nos canais de contato.
      </p>

      <StoreSettingsForm initial={settings} canEditConversionCopy={adminSession?.role === "ADMIN"} />
    </div>
  );
}
