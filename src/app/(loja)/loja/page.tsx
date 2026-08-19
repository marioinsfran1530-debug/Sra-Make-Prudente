import { getStoreSettings } from "@/lib/data";
import { waLink } from "@/lib/whatsapp";
import { InfoRow } from "@/components/InfoRow";

export const revalidate = 60;

export default async function LojaInfoPage() {
  const settings = await getStoreSettings();
  const whatsapp = settings?.whatsapp ?? "5518991248713";
  const mapsUrl =
    settings?.googleMapsUrl ||
    (settings?.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`
      : undefined);
  const instagram = settings?.instagram ?? "@sramakeprudente";

  return (
    <main className="px-4 pt-4 pb-8">
      <div
        className="rounded-3xl overflow-hidden mb-4 p-6 text-white"
        style={{
          background: "linear-gradient(135deg, #E4127B 0%, #A6157A 55%, #6E1E8C 100%)",
        }}
      >
        <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">
          Loja física de verdade
        </p>
        <h1 className="font-serif font-bold text-2xl">
          {settings?.storeName ?? "Sra Make Prudente"}
        </h1>
        <p className="text-white/85 text-sm mt-2 max-w-2xl">
          Compre pelo catálogo, tire dúvidas com a equipe e retire seu pedido diretamente na loja.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InfoRow
          icon="location"
          title="Endereço"
          text={settings?.address ?? "Endereço ainda não cadastrado."}
          action={mapsUrl ? { label: "Como chegar", href: mapsUrl } : undefined}
          trackKind="location"
        />

        <InfoRow
          icon="clock"
          title="Horário"
          text={settings?.businessHours ?? "Horário de funcionamento ainda não cadastrado."}
        />

        <InfoRow
          icon="whatsapp"
          title="WhatsApp"
          text={settings?.whatsapp ?? "WhatsApp não cadastrado"}
          action={{
            label: "Conversar",
            href: waLink("Oi! Vim pelo catálogo da Sra Make Prudente.", whatsapp),
          }}
          whatsapp
          trackKind="whatsapp"
        />

        <InfoRow
          icon="instagram"
          title="Instagram"
          text={instagram}
          action={{
            label: "Seguir",
            href: `https://instagram.com/${instagram.replace("@", "")}`,
          }}
        />

        {settings?.facebook && (
          <InfoRow
            icon="facebook"
            title="Facebook"
            text={settings.facebook}
            action={
              settings.facebook.startsWith("http")
                ? { label: "Acessar", href: settings.facebook }
                : undefined
            }
          />
        )}
      </div>
    </main>
  );
}
