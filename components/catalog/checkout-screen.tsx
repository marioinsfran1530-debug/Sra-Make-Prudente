"use client"

import { useState, type ReactNode, type ComponentType } from "react"
import { Store, Truck, Send } from "lucide-react"
import { C, PRODUCTS, money, waLink, type CartItem } from "@/lib/catalog"
import { Chip } from "./ui"
import type { Screen } from "./app"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl px-4 py-2.5" style={{ border: `1px solid ${C.bordaForte}` }}>
      <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: C.cinza }}>{label}</p>
      {children}
    </div>
  )
}

function ToggleCard({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ComponentType<{ size?: number; style?: React.CSSProperties }>
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-2xl p-3 flex flex-col items-center gap-1 transition-transform active:scale-95"
      style={active ? { backgroundColor: C.rosa } : { border: `1px solid ${C.bordaForte}` }}
    >
      <Icon size={18} style={{ color: active ? "#fff" : C.texto }} />
      <span className="text-xs font-semibold" style={{ color: active ? "#fff" : C.texto }}>{label}</span>
    </button>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: C.cinza }}>{label}</span>
      <span className={bold ? "font-extrabold" : "font-medium"} style={{ color: bold ? C.rosaProfundo : C.texto }}>{value}</span>
    </div>
  )
}

export function CheckoutScreen({
  cart,
  clearCart,
}: {
  cart: CartItem[]
  setScreen: (s: Screen) => void
  clearCart: () => void
}) {
  const [step, setStep] = useState<"form" | "review">("form")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [delivery, setDelivery] = useState<"retirada" | "entrega">("retirada")
  const [address, setAddress] = useState("")
  const [payment, setPayment] = useState("Pix")
  const [notes, setNotes] = useState("")

  const items = cart
    .map((c) => ({ ...c, product: PRODUCTS.find((p) => p.id === c.productId)! }))
    .filter((c) => c.product)
  const subtotal = items.reduce((sum, i) => sum + (i.product.promo || i.product.price) * i.qty, 0)

  const canReview = name.trim() && phone.trim() && (delivery !== "entrega" || address.trim())

  const buildMessage = () => {
    const lines = items.map(
      (i) => `- ${i.product.name}${i.variant ? " (" + i.variant + ")" : ""} — ${i.qty} — ${money((i.product.promo || i.product.price) * i.qty)}`,
    )
    return [
      "Olá! Quero fazer um pedido na Sra Make Prudente.",
      "",
      `Nome: ${name}`,
      "",
      "Produtos:",
      ...lines,
      "",
      `Subtotal: ${money(subtotal)}`,
      "",
      `Recebimento: ${delivery === "retirada" ? "Retirar na loja" : "Entrega"}`,
      delivery === "entrega" ? `Endereço: ${address}` : null,
      `Pagamento: ${payment}`,
      notes ? `Observação: ${notes}` : null,
      "",
      "Vim pelo catálogo da Sra Make Prudente.",
    ]
      .filter((l): l is string => l !== null)
      .join("\n")
  }

  if (step === "form") {
    return (
      <div className="px-4 pt-4 pb-8">
        <p className="font-serif font-bold text-lg mb-4" style={{ color: C.texto }}>Seus dados</p>
        <div className="flex flex-col gap-3">
          <Field label="Nome">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="w-full outline-none text-sm bg-transparent" style={{ color: C.texto }} />
          </Field>
          <Field label="WhatsApp">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(18) 9 9999-9999" className="w-full outline-none text-sm bg-transparent" style={{ color: C.texto }} />
          </Field>

          <p className="text-xs font-bold mt-2" style={{ color: C.texto }}>Como deseja receber?</p>
          <div className="flex gap-2">
            <ToggleCard active={delivery === "retirada"} onClick={() => setDelivery("retirada")} icon={Store} label="Retirar na loja" />
            <ToggleCard active={delivery === "entrega"} onClick={() => setDelivery("entrega")} icon={Truck} label="Entrega" />
          </div>
          {delivery === "entrega" && (
            <Field label="Endereço de entrega">
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro" className="w-full outline-none text-sm bg-transparent" style={{ color: C.texto }} />
            </Field>
          )}

          <p className="text-xs font-bold mt-2" style={{ color: C.texto }}>Forma de pagamento</p>
          <div className="grid grid-cols-2 gap-2">
            {["Pix", "Dinheiro", "Cartão", "Confirmar pelo WhatsApp"].map((opt) => (
              <Chip key={opt} active={payment === opt} onClick={() => setPayment(opt)}>{opt}</Chip>
            ))}
          </div>

          <Field label="Observação (opcional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Quero trocar a cor da base." rows={2} className="w-full outline-none text-sm resize-none bg-transparent" style={{ color: C.texto }} />
          </Field>
        </div>

        <button
          disabled={!canReview}
          onClick={() => setStep("review")}
          className="w-full mt-6 py-3.5 rounded-full font-bold text-sm text-white disabled:opacity-40 transition-transform active:scale-[0.98]"
          style={{ backgroundColor: C.rosa }}
        >
          Revisar pedido
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-8">
      <p className="font-serif font-bold text-lg mb-4" style={{ color: C.texto }}>Confira seu pedido</p>
      <div className="flex flex-col gap-2 mb-4">
        {items.map((i) => (
          <div key={i.productId + (i.variant || "")} className="flex justify-between text-sm">
            <span style={{ color: C.texto }}>
              {i.product.name}
              {i.variant ? ` (${i.variant})` : ""} × {i.qty}
            </span>
            <span className="font-bold" style={{ color: C.rosaProfundo }}>{money((i.product.promo || i.product.price) * i.qty)}</span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl p-4 flex flex-col gap-1.5 text-sm" style={{ backgroundColor: C.creme }}>
        <Row label="Subtotal" value={money(subtotal)} bold />
        <Row label="Recebimento" value={delivery === "retirada" ? "Retirar na loja" : "Entrega"} />
        {delivery === "entrega" && <Row label="Endereço" value={address} />}
        <Row label="Pagamento" value={payment} />
        {notes && <Row label="Observação" value={notes} />}
      </div>

      <div className="flex gap-2 mt-6">
        <button
          onClick={() => setStep("form")}
          className="px-4 py-3.5 rounded-full font-bold text-sm transition-transform active:scale-95"
          style={{ border: `1px solid ${C.bordaForte}`, color: C.texto }}
        >
          Voltar
        </button>
        <a
          href={waLink(buildMessage())}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => clearCart()}
          className="flex-1 py-3.5 rounded-full font-bold text-sm text-white flex items-center justify-center gap-2 text-center transition-transform active:scale-[0.98]"
          style={{ backgroundColor: C.whatsapp }}
        >
          <Send size={16} /> Enviar pedido pelo WhatsApp
        </a>
      </div>
      <p className="text-[11px] text-center mt-3 leading-relaxed" style={{ color: C.cinza }}>
        O pedido é confirmado com a gente pelo WhatsApp. Nenhum pagamento é feito por aqui.
      </p>
    </div>
  )
}
