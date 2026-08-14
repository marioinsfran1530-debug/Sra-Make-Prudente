import { MapPin, MessageCircle, Instagram, Clock } from "lucide-react";
import { getStoreSettings } from "@/lib/data";
import { waLink } from "@/lib/whatsapp";

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
        <InfoRow icon={MapPin} title="Endereço" text={settings?.address ?? "—"} action={mapsUrl ? { label: "Como chegar", href: mapsUrl } : undefined} />
        <InfoRow
          icon={MessageCircle}
          title="WhatsApp"
          text="(18) 99124-8713"
          action={{ label: "Conversar", href: waLink("Oi! Vim pelo catálogo da Sra Make Prudente.") }}
          whatsapp
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

function InfoRow({
  icon: Icon,
  title,
  text,
  action,
  whatsapp,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  text: string;
  action?: { label: string; href: string };
  whatsapp?: boolean;
}) {
  return (
    <div className="rounded-2xl p-4 flex items-start gap-3 bg-white" style={{ boxShadow: "0 2px 14px rgba(35,20,42,0.06)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-creme">
        <Icon size={18} className="text-rosa-profundo" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold text-texto">{title}</p>
        <p className="text-xs mt-0.5 text-cinza">{text}</p>
        {action && (
          <a
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-xs font-bold px-3 py-1.5 rounded-full"
            style={whatsapp ? { backgroundColor: "#25D366", color: "#fff" } : { backgroundColor: "#FFF6FA", color: "#A6157A" }}
          >
            {action.label}
          </a>
        )}
      </div>
    </div>
  );
}
