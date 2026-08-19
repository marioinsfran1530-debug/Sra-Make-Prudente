"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Minus, X, ArrowRight } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { ProductImage } from "@/components/ProductImage";
import { money } from "@/lib/money";
import { trackEvent } from "@/lib/analytics";

export default function CarrinhoPage() {
  const router = useRouter();
  const { items, subtotal, updateQty, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <main className="max-w-xl mx-auto flex flex-col items-center text-center px-6 py-20 pb-28">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-creme">
          <ShoppingCart size={27} className="text-rosa-profundo" />
        </div>
        <h1 className="font-serif font-bold text-xl text-texto">Seu carrinho está vazio</h1>
        <p className="text-sm mt-2 mb-5 text-cinza">Adicione produtos do catálogo para montar seu pedido.</p>
        <button
          onClick={() => router.push("/categoria")}
          className="text-sm font-bold px-6 py-3 rounded-full text-white shadow-sm"
          style={{ backgroundColor: "#E4127B" }}
        >
          Ver catálogo
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 pt-5 pb-28 md:pb-8">
      <CheckoutProgress current={1} />

      <div className="mt-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-rosa-profundo">Carrinho</p>
        <h1 className="font-serif font-bold text-2xl text-texto mt-1">Seu pedido</h1>
        <p className="text-xs text-cinza mt-1">Confira os produtos antes de continuar.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 mt-5 items-start">
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.productId + (item.variantId ?? "")}
              className="flex gap-3 rounded-2xl p-3 bg-white border border-rosa/10"
              style={{ boxShadow: "0 2px 14px rgba(35,20,42,0.06)" }}
            >
              <ProductImage
                name={item.name}
                imageUrl={item.imageUrl}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex-shrink-0"
              />

              <div className="flex-1 min-w-0 py-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-cinza">{item.brand}</p>
                <p className="text-sm sm:text-base font-bold leading-snug text-texto">{item.name}</p>
                {item.variantName && <p className="text-xs text-cinza mt-0.5">{item.variantName}</p>}

                <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                  <div className="flex items-center rounded-full border border-rosa/20 bg-white">
                    <button
                      type="button"
                      aria-label="Diminuir quantidade"
                      onClick={() => updateQty(item.productId, item.variantId, item.qty - 1)}
                      className="w-8 h-8 flex items-center justify-center"
                    >
                      <Minus size={13} className="text-texto" />
                    </button>
                    <span className="w-7 text-center font-bold text-xs text-texto">{item.qty}</span>
                    <button
                      type="button"
                      aria-label="Aumentar quantidade"
                      onClick={() => updateQty(item.productId, item.variantId, item.qty + 1)}
                      className="w-8 h-8 flex items-center justify-center"
                    >
                      <Plus size={13} className="text-texto" />
                    </button>
                  </div>

                  <div className="text-right">
                    {item.qty > 1 && <p className="text-[10px] text-cinza">{money(item.price)} cada</p>}
                    <p className="font-extrabold text-base text-rosa-profundo">{money(item.price * item.qty)}</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                aria-label={`Remover ${item.name}`}
                title="Remover produto"
                onClick={() => removeItem(item.productId, item.variantId)}
                className="self-start w-8 h-8 rounded-full flex items-center justify-center border border-transparent text-cinza hover:border-rosa/15 hover:bg-creme hover:text-rosa-profundo transition"
              >
                <X size={16} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => router.push("/categoria")}
            className="self-start text-xs font-bold text-rosa-profundo px-1 py-2"
          >
            + Continuar comprando
          </button>
        </div>

        <aside className="lg:sticky lg:top-5">
          <div className="rounded-2xl bg-white border border-rosa/15 shadow-sm p-5">
            <p className="font-serif font-bold text-lg text-texto">Resumo do pedido</p>
            <div className="flex items-center justify-between mt-5 pb-4 border-b border-rosa/10">
              <span className="text-sm text-cinza">Produtos</span>
              <span className="text-sm font-semibold text-texto">
                {items.reduce((total, item) => total + item.qty, 0)} un.
              </span>
            </div>
            <div className="flex items-center justify-between py-4">
              <span className="text-sm font-bold text-texto">Subtotal</span>
              <span className="font-extrabold text-xl text-rosa-profundo">{money(subtotal)}</span>
            </div>
            <p className="text-[11px] text-cinza mb-4">
              Entrega ou retirada e forma de pagamento serão escolhidas na próxima etapa.
            </p>
            <button
              type="button"
              onClick={() => {
                trackEvent("begin_checkout", { itemCount: items.length, subtotal });
                router.push("/checkout");
              }}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-sm"
              style={{ backgroundColor: "#E4127B" }}
            >
              Continuar pedido <ArrowRight size={16} />
            </button>
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
