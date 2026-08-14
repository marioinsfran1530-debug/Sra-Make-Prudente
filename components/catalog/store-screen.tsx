"use client"

import { MapPin, MessageCircle, Instagram, Clock, type LucideIcon } from "lucide-react"
import { C, GRADIENT_HERO, STORE_ADDRESS, MAPS_URL, INSTAGRAM_URL, waLink } from "@/lib/catalog"

function InfoRow({
  icon: Icon,
  title,
  text,
  action,
  whatsapp,
}: {
  icon: LucideIcon
  title: string
  text: string
  action?: { label: string; href: string }
  whatsapp?: boolean
}) {
  return (
    <div className="rounded-2xl p-4 flex items-start gap-3" style={{ backgroundColor: "#fff", boxShadow: "var(--shadow-soft)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.creme }}>
        <Icon size={18} style={{ color: C.rosaProfundo }} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold" style={{ color: C.texto }}>{title}</p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: C.cinza }}>{text}</p>
        {action && (
          <a
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-xs font-bold px-3 py-1.5 rounded-full transition-transform active:scale-95"
            style={whatsapp ? { backgroundColor: C.whatsapp, color: "#fff" } : { backgroundColor: C.creme, color: C.rosaProfundo }}
          >
            {action.label}
          </a>
        )}
      </div>
    </div>
  )
}

export function StoreScreen() {
  return (
    <div className="px-4 pt-4 pb-8">
      <div className="rounded-3xl overflow-hidden mb-4" style={{ background: GRADIENT_HERO }}>
        <div className="p-6">
          <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">Loja física de verdade</p>
          <h2 className="text-white font-serif font-bold text-xl">Sra Make Prudente</h2>
          <p className="text-white/85 text-sm mt-2 leading-relaxed">Você pode comprar pelo catálogo e retirar no Box 202.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <InfoRow icon={MapPin} title="Endereço" text={STORE_ADDRESS} action={{ label: "Como chegar", href: MAPS_URL }} />
        <InfoRow icon={MessageCircle} title="WhatsApp" text="(18) 99124-8713" action={{ label: "Conversar", href: waLink("Oi! Vim pelo catálogo da Sra Make Prudente.") }} whatsapp />
        <InfoRow icon={Instagram} title="Instagram" text="@sramakeprudente" action={{ label: "Seguir", href: INSTAGRAM_URL }} />
        <InfoRow icon={Clock} title="Horário" text="Cadastre o horário de funcionamento no painel administrativo." />
      </div>
    </div>
  )
}
