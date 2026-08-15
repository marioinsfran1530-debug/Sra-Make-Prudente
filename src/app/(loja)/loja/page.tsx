import { MapPin, MessageCircle, Instagram, Clock } from "lucide-react";
import { getStoreSettings } from "@/lib/data";
import { waLink } from "@/lib/whatsapp";
import { InfoRow } from "@/components/InfoRow";

export const revalidate = 60;

export default async function LojaInfoPage() {
  const settings = await getStoreSettings();

  const mapsUrl = settings?.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`
    : undefined;

  return (
    <main className="px-4 pt-4 pb-8">
      <div
        className="rounded-3xl overflow-hidden mb-4 p-6 text-white"
        style={{ background: "linear-gradient(135deg, #E4127B 0%, #A6157A 55%, #6E1E8C 100%)" }}
      >
        <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">
          Loja física de verdade
        </p>
        <h2 className="font-serif font-bold text-xl">{settings?.storeName ?? "Sra Make Prudente"}</h2>
        <p className="text-white/85 text-sm mt-2">
          Você pode comprar pelo catálogo e retirar no Box 202.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <InfoRow
          icon={MapPin}
          title="Endereço"
          text={settings?.address ?? "—"}
          action={mapsUrl ? { label: "Como chegar", href: mapsUrl } : undefined}
          trackKind="location"
        />
        <InfoRow
          icon={MessageCircle}
          title="WhatsApp"
          text="(18) 99124-8713"
          action={{ label: "Conversar", href: waLink("Oi! Vim pelo catálogo da Sra Make Prudente.") }}
          whatsapp
          trackKind="whatsapp"
        />
        <InfoRow
          icon={Instagram}
          title="Instagram"
          text={settings?.instagram ?? "@sramakeprudente"}
          action={{ label: "Seguir", href: `https://instagram.com/${(settings?.instagram ?? "sramakeprudente").replace("@", "")}` }}
        />
        <InfoRow icon={Clock} title="Horário" text="Cadastre o horário de funcionamento no painel administrativo." />
      </div>
    </main>
  );
}
