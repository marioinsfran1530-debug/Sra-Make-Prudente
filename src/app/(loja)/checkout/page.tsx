"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Truck, Send } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { money } from "@/lib/money";
import { waLink, buildOrderMessage } from "@/lib/whatsapp";
import { getTrackingPayload } from "@/lib/tracking";
import { trackEvent } from "@/lib/analytics";

const PAYMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "PIX", label: "Pix" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "CARTAO", label: "Cartão" },
  { value: "CONFIRMAR_WHATSAPP", label: "Confirmar pelo WhatsApp" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();

  const [step, setStep] = useState<"form" | "review">("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"RETIRADA" | "ENTREGA">("RETIRADA");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState("PIX");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0 && step === "form") {
    return (
      <main className="px-6 py-16 text-center">
        <p className="text-sm text-cinza">Seu carrinho está vazio.</p>
        <button
          onClick={() => router.push("/categoria")}
          className="mt-4 text-sm font-bold px-5 py-2.5 rounded-full text-white"
          style={{ backgroundColor: "#E4127B" }}
        >
          Ver catálogo
        </button>
      </main>
    );
  }

  const canReview = name.trim() && phone.trim() && (deliveryType !== "ENTREGA" || address.trim());

  async function handleSendOrder() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            qty: i.qty,
          })),
          customerName: name,
          customerPhone: phone,
          deliveryType,
          address: deliveryType === "ENTREGA" ? address : undefined,
          payment,
          notes: notes || undefined,
          ...getTrackingPayload(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível enviar o pedido. Tente novamente.");
        setSubmitting(false);
        return;
      }

      const message = buildOrderMessage({
        orderNumber: data.orderNumber,
        customerName: name,
        items: data.items,
        subtotal: data.subtotal,
        deliveryFee: data.deliveryFee,
        total: data.total,
        deliveryType,
        address,
        payment,
        notes,
      });

      clear();
      trackEvent("order_created", { orderNumber: data.orderNumber, total: data.total });
      trackEvent("whatsapp_click", { context: "checkout", orderNumber: data.orderNumber });
      window.open(waLink(message), "_blank");
      router.push("/");
    } catch {
      setError("Não foi possível enviar o pedido. Verifique sua conexão e tente novamente.");
      setSubmitting(false);
    }
  }

  if (step === "form") {
    return (
      <main className="px-4 pt-4 pb-8">
        <p className="font-serif font-bold text-lg mb-4 text-texto">Seus dados</p>
        <div className="flex flex-col gap-3">
          <Field label="Nome">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="w-full outline-none text-sm text-texto"
            />
          </Field>
          <Field label="WhatsApp">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(18) 9 9999-9999"
              className="w-full outline-none text-sm text-texto"
            />
          </Field>

          <p className="text-xs font-bold mt-2 text-texto">Como deseja receber?</p>
          <div className="flex gap-2">
            <ToggleCard
              active={deliveryType === "RETIRADA"}
              onClick={() => setDeliveryType("RETIRADA")}
              icon={Store}
              label="Retirar na loja"
            />
            <ToggleCard
              active={deliveryType === "ENTREGA"}
              onClick={() => setDeliveryType("ENTREGA")}
              icon={Truck}
              label="Entrega"
            />
          </div>
          {deliveryType === "ENTREGA" && (
            <Field label="Endereço de entrega">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, bairro"
                className="w-full outline-none text-sm text-texto"
              />
            </Field>
          )}

          <p className="text-xs font-bold mt-2 text-texto">Forma de pagamento</p>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPayment(opt.value)}
                className="rounded-full px-4 py-1.5 text-xs font-semibold"
                style={
                  payment === opt.value
                    ? { backgroundColor: "#E4127B", color: "#fff" }
                    : { backgroundColor: "#fff", color: "#23142A", border: "1px solid #E9D9E4" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Field label="Observação (opcional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Quero trocar a cor da base."
              rows={2}
              className="w-full outline-none text-sm resize-none text-texto"
            />
          </Field>
        </div>

        <button
          disabled={!canReview}
          onClick={() => setStep("review")}
          className="w-full mt-6 py-3.5 rounded-full font-bold text-sm text-white disabled:opacity-40"
          style={{ backgroundColor: "#E4127B" }}
        >
          Revisar pedido
        </button>
      </main>
    );
  }

  return (
    <main className="px-4 pt-4 pb-8">
      <p className="font-serif font-bold text-lg mb-4 text-texto">Confira seu pedido</p>
      <div className="flex flex-col gap-2 mb-4">
        {items.map((i) => (
          <div key={i.productId + (i.variantId ?? "")} className="flex justify-between text-sm">
            <span className="text-texto">
              {i.name}
              {i.variantName ? ` (${i.variantName})` : ""} × {i.qty}
            </span>
            <span className="font-bold text-rosa-profundo">{money(i.price * i.qty)}</span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl p-4 flex flex-col gap-1.5 text-sm bg-creme">
        <Row label="Subtotal" value={money(subtotal)} bold />
        <Row label="Recebimento" value={deliveryType === "RETIRADA" ? "Retirar na loja" : "Entrega"} />
        {deliveryType === "ENTREGA" && <Row label="Endereço" value={address} />}
        <Row
          label="Pagamento"
          value={PAYMENT_OPTIONS.find((p) => p.value === payment)?.label ?? payment}
        />
        {notes && <Row label="Observação" value={notes} />}
      </div>

      {error && <p className="text-xs text-vermelho mt-3">{error}</p>}

      <div className="flex gap-2 mt-6">
        <button
          onClick={() => setStep("form")}
          className="px-4 py-3.5 rounded-full font-bold text-sm border border-rosa/20 text-texto"
        >
          Voltar
        </button>
        <button
          onClick={handleSendOrder}
          disabled={submitting}
          className="flex-1 py-3.5 rounded-full font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: "#25D366" }}
        >
          <Send size={16} /> {submitting ? "Enviando..." : "Enviar pedido pelo WhatsApp"}
        </button>
      </div>
      <p className="text-[11px] text-center mt-3 text-cinza">
        O pedido é confirmado com a gente pelo WhatsApp. Nenhum pagamento é feito por aqui.
      </p>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl px-4 py-2.5 border border-rosa/20">
      <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5 text-cinza">{label}</p>
      {children}
    </div>
  );
}

function ToggleCard({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-2xl p-3 flex flex-col items-center gap-1"
      style={active ? { backgroundColor: "#E4127B" } : { border: "1px solid #E9D9E4" }}
    >
      <Icon size={18} className={active ? "text-white" : "text-texto"} />
      <span className="text-xs font-semibold" style={{ color: active ? "#fff" : "#23142A" }}>
        {label}
      </span>
    </button>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-cinza">{label}</span>
      <span
        className={bold ? "font-extrabold" : "font-medium"}
        style={{ color: bold ? "#A6157A" : "#23142A" }}
      >
        {value}
      </span>
    </div>
  );
}
