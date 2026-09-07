"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Truck,
  Send,
  ArrowLeft,
  Bell,
  CheckCircle2,
  MessageCircle,
  Copy,
  ShoppingBag,
} from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { money } from "@/lib/money";
import { waLink, buildOrderMessage } from "@/lib/whatsapp";
import { getTrackingPayload } from "@/lib/tracking";
import { trackEvent } from "@/lib/analytics";
import { subscribeToOrderNotifications } from "@/lib/push-client";
import { submitOrderWithRetry } from "@/lib/order-client-resilience";

const PAYMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "PIX", label: "Pix" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "CARTAO", label: "Cartão" },
  { value: "CONFIRMAR_WHATSAPP", label: "Confirmar pelo WhatsApp" },
];

type CheckoutSuccess = {
  orderNumber: number;
  total: number;
  duplicate: boolean;
  message: string;
  whatsappUrl: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();

  const [step, setStep] = useState<"form" | "review">("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"RETIRADA" | "ENTREGA">(
    "RETIRADA"
  );
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState("PIX");
  const [notes, setNotes] = useState("");
  const [wantsNotifications, setWantsNotifications] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CheckoutSuccess | null>(null);
  const [copied, setCopied] = useState(false);

  const canReview =
    name.trim() &&
    phone.trim() &&
    (deliveryType !== "ENTREGA" || address.trim());

  async function handleSendOrder() {
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      if (wantsNotifications) {
        const pushResult = await subscribeToOrderNotifications(phone);

        trackEvent("order_push_opt_in", {
          result: pushResult,
        });
      }

      const payload = {
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          qty: item.qty,
        })),
        customerName: name,
        customerPhone: phone,
        deliveryType,
        address: deliveryType === "ENTREGA" ? address : undefined,
        payment,
        notes: notes || undefined,
        ...getTrackingPayload(),
      };

      const result = await submitOrderWithRetry(payload);
      const data = result.data;

      if (!result.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Não foi possível registrar o pedido. Tente novamente."
        );
        setSubmitting(false);
        return;
      }

      const message = buildOrderMessage({
        orderNumber: data.orderNumber,
        customerName: name,
        customerPhone: phone,
        items: data.items,
        subtotal: data.subtotal,
        deliveryFee: data.deliveryFee,
        total: data.total,
        deliveryType,
        address,
        payment,
        notes,
      });

      const whatsappUrl = waLink(message);

      trackEvent("order_created", {
        orderNumber: data.orderNumber,
        total: data.total,
        duplicate: data.duplicate === true,
      });

      clear();
      setSubmitting(false);
      setSuccess({
        orderNumber: data.orderNumber,
        total: data.total,
        duplicate: data.duplicate === true,
        message,
        whatsappUrl,
      });
    } catch {
      setError(
        "Não foi possível confirmar o pedido agora. Verifique sua conexão e tente novamente. Se o pedido já tiver sido recebido, o sistema evitará criar outro igual."
      );
      setSubmitting(false);
    }
  }

  function handleWhatsAppClick() {
    if (!success) return;

    trackEvent("whatsapp_click", {
      context: "checkout_success",
      orderNumber: success.orderNumber,
    });
  }

  async function handleCopyMessage() {
    if (!success) return;

    try {
      await navigator.clipboard.writeText(success.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copie a mensagem do pedido:", success.message);
    }
  }

  if (success) {
    return (
      <main className="mx-auto max-w-xl px-4 py-8 pb-28 sm:py-12">
        <div className="rounded-3xl border border-rosa/15 bg-white p-5 text-center shadow-sm sm:p-7">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
            <CheckCircle2 size={30} />
          </div>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-rosa-profundo">
            Pedido registrado
          </p>
          <h1 className="mt-1 font-serif text-2xl font-bold text-texto">
            Pedido #{success.orderNumber} recebido
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-cinza">
            Seu pedido já está salvo no sistema da Sra Make. Agora abra o WhatsApp e envie a mensagem pronta para confirmar o atendimento com a loja.
          </p>

          <div className="mt-5 flex items-center justify-between rounded-2xl bg-creme/60 px-4 py-3 text-left">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">
                Total do pedido
              </p>
              <p className="text-xs text-texto">
                {success.duplicate
                  ? "Pedido já registrado com segurança"
                  : "Registro concluído com sucesso"}
              </p>
            </div>
            <strong className="text-lg text-rosa-profundo">
              {money(success.total)}
            </strong>
          </div>

          <a
            href={success.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsAppClick}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white shadow-sm"
            style={{ backgroundColor: "#25D366" }}
          >
            <MessageCircle size={18} />
            Abrir WhatsApp para confirmar
          </a>

          <button
            type="button"
            onClick={handleCopyMessage}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-rosa/20 px-5 py-3 text-xs font-bold text-texto"
          >
            <Copy size={15} />
            {copied ? "Mensagem copiada" : "Copiar mensagem do pedido"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold text-rosa-profundo"
          >
            <ShoppingBag size={15} />
            Continuar comprando
          </button>

          <p className="mt-4 text-[10px] leading-relaxed text-cinza">
            Se o WhatsApp não abrir, toque novamente ou copie a mensagem. Seu pedido já foi registrado e não precisa ser feito outra vez.
          </p>
        </div>
      </main>
    );
  }

  if (items.length === 0 && step === "form") {
    return (
      <main className="max-w-xl mx-auto px-6 py-20 pb-28 text-center">
        <p className="font-serif font-bold text-xl text-texto">
          Seu carrinho está vazio
        </p>
        <p className="text-sm text-cinza mt-2">
          Adicione produtos antes de continuar.
        </p>
        <button
          onClick={() => router.push("/categoria")}
          className="mt-5 text-sm font-bold px-6 py-3 rounded-full text-white"
          style={{ backgroundColor: "#E4127B" }}
        >
          Ver catálogo
        </button>
      </main>
    );
  }

  if (step === "form") {
    return (
      <main className="max-w-6xl mx-auto px-4 pt-5 pb-28">
        <CheckoutProgress current={2} />

        <div className="mt-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-rosa-profundo">
            Finalizar pedido
          </p>
          <h1 className="font-serif font-bold text-2xl text-texto mt-1">
            Seus dados
          </h1>
          <p className="text-xs text-cinza mt-1">
            Preencha as informações para continuarmos.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 mt-6 items-start">
          <div className="rounded-2xl bg-white border border-rosa/10 shadow-sm p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nome">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-transparent outline-none text-sm text-texto"
                />
              </Field>

              <Field label="WhatsApp">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(18) 9 9999-9999"
                  className="w-full bg-transparent outline-none text-sm text-texto"
                />
              </Field>
            </div>

            <p className="text-xs font-bold mt-5 mb-2 text-texto">
              Como deseja receber?
            </p>

            <div className="grid grid-cols-2 gap-2">
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
              <div className="mt-3">
                <Field label="Endereço de entrega">
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, bairro"
                    className="w-full bg-transparent outline-none text-sm text-texto"
                  />
                </Field>
              </div>
            )}

            <p className="text-xs font-bold mt-5 mb-2 text-texto">
              Forma de pagamento
            </p>

            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setPayment(option.value)}
                  className={`rounded-xl px-3 py-2.5 text-xs font-semibold border transition ${
                    payment === option.value
                      ? "bg-rosa-profundo border-rosa-profundo text-white"
                      : "bg-white border-rosa/20 text-texto hover:bg-creme"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <Field label="Observação (opcional)">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Quero trocar a cor da base."
                  rows={3}
                  className="w-full bg-transparent outline-none text-sm resize-none text-texto"
                />
              </Field>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <button
                type="button"
                onClick={() => router.push("/carrinho")}
                className="px-5 py-3 rounded-xl font-bold text-sm border border-rosa/20 text-texto"
              >
                Voltar ao carrinho
              </button>

              <button
                type="button"
                disabled={!canReview}
                onClick={() => setStep("review")}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40"
                style={{ backgroundColor: "#E4127B" }}
              >
                Revisar pedido
              </button>
            </div>
          </div>

          <OrderSummary items={items} subtotal={subtotal} />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 pt-5 pb-28">
      <CheckoutProgress current={3} />

      <div className="mt-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-rosa-profundo">
          Última etapa
        </p>
        <h1 className="font-serif font-bold text-2xl text-texto mt-1">
          Confira seu pedido
        </h1>
        <p className="text-xs text-cinza mt-1">
          Primeiro registramos o pedido no sistema. Depois você abre o WhatsApp para confirmar o atendimento com a loja.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 mt-6 items-start">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-white border border-rosa/10 shadow-sm p-4 sm:p-5">
            <p className="text-sm font-bold text-texto mb-4">Produtos</p>

            <div className="flex flex-col divide-y divide-rosa/10">
              {items.map((item) => (
                <div
                  key={item.productId + (item.variantId ?? "")}
                  className="flex justify-between gap-4 py-3 first:pt-0 last:pb-0 text-sm"
                >
                  <span className="text-texto">
                    {item.name}
                    {item.variantName ? ` (${item.variantName})` : ""}
                    {" × "}
                    {item.qty}
                  </span>
                  <span className="font-bold text-rosa-profundo whitespace-nowrap">
                    {money(item.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-rosa/10 shadow-sm p-4 sm:p-5">
            <p className="text-sm font-bold text-texto mb-4">
              Recebimento e pagamento
            </p>

            <div className="flex flex-col gap-3">
              <Row
                label="Recebimento"
                value={
                  deliveryType === "RETIRADA" ? "Retirar na loja" : "Entrega"
                }
              />

              {deliveryType === "ENTREGA" && (
                <Row label="Endereço" value={address} />
              )}

              <Row
                label="Pagamento"
                value={
                  PAYMENT_OPTIONS.find((option) => option.value === payment)
                    ?.label ?? payment
                }
              />

              {notes && <Row label="Observação" value={notes} />}
            </div>
          </div>

          {error && <p className="text-xs text-vermelho">{error}</p>}
        </div>

        <aside className="lg:sticky lg:top-5">
          <div className="rounded-2xl bg-white border border-rosa/15 shadow-sm p-5">
            <div className="flex items-center justify-between pb-4 border-b border-rosa/10">
              <span className="text-sm text-cinza">Subtotal</span>
              <span className="font-extrabold text-xl text-rosa-profundo">
                {money(subtotal)}
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-cinza mt-4">
              O pedido será registrado primeiro no sistema da Sra Make. Depois você poderá abrir o WhatsApp com a mensagem pronta para confirmar com a loja.
            </p>

            <label className="mt-4 flex items-start gap-3 rounded-xl border border-rosa/15 bg-creme/40 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={wantsNotifications}
                onChange={(e) => setWantsNotifications(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-rosa-profundo"
              />

              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-xs font-bold text-texto">
                  <Bell size={14} className="text-rosa-profundo" />
                  Quero receber atualizações deste pedido neste aparelho
                </span>
                <span className="block text-[10px] leading-relaxed text-cinza mt-1">
                  Avisaremos quando o pedido for confirmado, estiver pronto ou sair para entrega.
                </span>
              </span>
            </label>

            <button
              type="button"
              onClick={handleSendOrder}
              disabled={submitting}
              className="w-full mt-4 py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
              style={{ backgroundColor: "#E4127B" }}
            >
              <Send size={16} />
              {submitting ? "Registrando pedido..." : "Confirmar pedido"}
            </button>

            <button
              type="button"
              onClick={() => setStep("form")}
              className="w-full mt-2 py-3 rounded-xl font-bold text-xs text-texto flex items-center justify-center gap-1"
            >
              <ArrowLeft size={14} />
              Alterar dados
            </button>

            <p className="text-[10px] leading-relaxed text-center mt-3 text-cinza">
              Nenhum pagamento é realizado pelo site.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function CheckoutProgress({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Carrinho", "Seus dados", "Confirmar"];

  return (
    <div className="rounded-2xl bg-white border border-rosa/10 px-3 sm:px-5 py-3 shadow-sm">
      <div className="grid grid-cols-3 gap-2">
        {steps.map((step, index) => {
          const number = index + 1;
          const active = number <= current;

          return (
            <div key={step} className="flex items-center gap-2 min-w-0">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                  active ? "bg-rosa-profundo text-white" : "bg-creme text-cinza"
                }`}
              >
                {number}
              </span>
              <span
                className={`text-[10px] sm:text-xs font-semibold truncate ${
                  active ? "text-texto" : "text-cinza"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderSummary({
  items,
  subtotal,
}: {
  items: ReturnType<typeof useCart>["items"];
  subtotal: number;
}) {
  return (
    <aside className="lg:sticky lg:top-5">
      <div className="rounded-2xl bg-white border border-rosa/15 shadow-sm p-5">
        <p className="font-serif font-bold text-lg text-texto">Resumo</p>

        <div className="mt-4 flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.productId + (item.variantId ?? "")}
              className="flex justify-between gap-3 text-xs"
            >
              <span className="text-cinza line-clamp-1">
                {item.qty}× {item.name}
              </span>
              <span className="font-semibold text-texto whitespace-nowrap">
                {money(item.price * item.qty)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-rosa/10">
          <span className="text-sm font-bold text-texto">Subtotal</span>
          <span className="font-extrabold text-lg text-rosa-profundo">
            {money(subtotal)}
          </span>
        </div>
      </div>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl px-4 py-2.5 border border-rosa/20 bg-white focus-within:border-rosa-profundo transition">
      <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5 text-cinza">
        {label}
      </p>
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
  icon: React.ComponentType<{
    size?: string | number;
    className?: string;
  }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl p-3 flex flex-col items-center gap-1 border transition ${
        active
          ? "bg-rosa-profundo border-rosa-profundo"
          : "bg-white border-rosa/20 hover:bg-creme"
      }`}
    >
      <Icon size={18} className={active ? "text-white" : "text-texto"} />
      <span
        className={
          active
            ? "text-xs font-semibold text-white"
            : "text-xs font-semibold text-texto"
        }
      >
        {label}
      </span>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-5">
      <span className="text-xs text-cinza">{label}</span>
      <span className="text-xs font-semibold text-texto sm:text-right">
        {value}
      </span>
    </div>
  );
}
