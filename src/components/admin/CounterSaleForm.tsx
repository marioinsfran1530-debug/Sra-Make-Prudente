"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Variant = {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  promoPrice: number | null;
  stockQty: number;
};

type Product = {
  id: string;
  name: string;
  brand: string;
  sku: string | null;
  price: number;
  promoPrice: number | null;
  stockQty: number;
  imageUrl: string | null;
  variants: Variant[];
};

type CartLine = {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  sku: string | null;
  qty: number;
  stockQty: number;
  unitPrice: number;
};

type PaymentMethod = "PIX" | "DINHEIRO" | "DEBITO" | "CREDITO";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function productPrice(product: Product, variant?: Variant | null) {
  if (variant) {
    if (variant.promoPrice !== null) return variant.promoPrice;
    if (variant.price !== null) return variant.price;
  }
  return product.promoPrice ?? product.price;
}

export function CounterSaleForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return products.slice(0, 18);
    return products
      .filter((product) => {
        const fields = [product.name, product.brand, product.sku ?? "", ...product.variants.map((v) => `${v.name} ${v.sku ?? ""}`)];
        return fields.some((field) => normalize(field).includes(q));
      })
      .slice(0, 30);
  }, [products, query]);

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const discountValue = Math.max(0, Number(String(discount).replace(",", ".")) || 0);
  const total = Math.max(0, subtotal - discountValue);

  function addLine(product: Product, variant: Variant | null) {
    const stockQty = variant ? variant.stockQty : product.stockQty;
    if (stockQty <= 0) {
      setError("Este item está sem estoque.");
      return;
    }
    const key = `${product.id}:${variant?.id ?? "base"}`;
    setCart((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        if (existing.qty >= stockQty) {
          setError("A quantidade já atingiu o estoque disponível.");
          return current;
        }
        return current.map((item) => (item.key === key ? { ...item, qty: item.qty + 1 } : item));
      }
      return [
        ...current,
        {
          key,
          productId: product.id,
          variantId: variant?.id ?? null,
          name: product.name,
          variantName: variant?.name ?? null,
          sku: variant?.sku ?? product.sku,
          qty: 1,
          stockQty,
          unitPrice: productPrice(product, variant),
        },
      ];
    });
    setError("");
    setQuery("");
  }

  function chooseProduct(product: Product) {
    if (product.variants.length === 0) {
      addLine(product, null);
      return;
    }
    if (product.variants.length === 1) {
      addLine(product, product.variants[0]);
      return;
    }
    setError("Escolha uma variação abaixo do produto.");
  }

  function updateQty(key: string, next: number) {
    setCart((current) =>
      current
        .map((item) => (item.key === key ? { ...item, qty: Math.min(item.stockQty, Math.max(0, next)) } : item))
        .filter((item) => item.qty > 0)
    );
  }

  async function finalize() {
    setError("");
    if (cart.length === 0) {
      setError("Adicione produtos antes de finalizar.");
      return;
    }
    if (discountValue > subtotal) {
      setError("O desconto não pode ser maior que o subtotal.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/counter-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({ productId: item.productId, variantId: item.variantId, qty: item.qty })),
          payments: [{ method: paymentMethod, amount: Number(total.toFixed(2)) }],
          discount: Number(discountValue.toFixed(2)),
          customerName,
          customerPhone,
          notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível finalizar a venda.");

      setCart([]);
      setDiscount("0");
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      router.push(`/admin/pedidos/${data.order.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao finalizar venda.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <label className="text-xs font-bold text-texto">Buscar produto, marca, SKU ou EAN</label>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Digite ou leia o código de barras..."
          className="mt-2 w-full rounded-xl border border-rosa/20 px-4 py-3 text-sm outline-none focus:border-rosa-profundo"
        />
        <p className="mt-1 text-[10px] text-cinza">Leitores de código de barras que funcionam como teclado podem ser usados diretamente neste campo.</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => {
            const available = product.variants.length > 0
              ? product.variants.reduce((sum, variant) => sum + variant.stockQty, 0)
              : product.stockQty;
            return (
              <div key={product.id} className="rounded-xl border border-rosa/10 p-3">
                <button type="button" onClick={() => chooseProduct(product)} className="w-full text-left">
                  <p className="line-clamp-2 text-sm font-bold text-texto">{product.name}</p>
                  <p className="mt-0.5 text-[10px] text-cinza">{product.brand}{product.sku ? ` · ${product.sku}` : ""}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-rosa-profundo">{money(productPrice(product))}</span>
                    <span className={`text-[10px] font-bold ${available > 0 ? "text-green-700" : "text-red-600"}`}>Estoque {available}</span>
                  </div>
                </button>
                {product.variants.length > 1 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-rosa/10 pt-2">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        disabled={variant.stockQty <= 0}
                        onClick={() => addLine(product, variant)}
                        className="rounded-lg border border-rosa/15 px-2 py-1.5 text-[10px] font-bold text-rosa-profundo disabled:opacity-40"
                      >
                        {variant.name} · {variant.stockQty}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <aside className="h-fit rounded-2xl bg-white p-4 shadow-sm lg:sticky lg:top-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-texto">Venda atual</h2>
          <span className="text-xs text-cinza">{cart.reduce((sum, item) => sum + item.qty, 0)} item(ns)</span>
        </div>

        <div className="mt-3 divide-y divide-rosa/10">
          {cart.length === 0 ? (
            <p className="py-6 text-center text-xs text-cinza">Nenhum produto adicionado.</p>
          ) : (
            cart.map((item) => (
              <div key={item.key} className="py-3">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-texto">{item.name}</p>
                    {item.variantName && <p className="text-[10px] text-cinza">{item.variantName}</p>}
                    <p className="text-[10px] text-cinza">{money(item.unitPrice)} cada · estoque {item.stockQty}</p>
                  </div>
                  <p className="shrink-0 text-xs font-extrabold text-rosa-profundo">{money(item.unitPrice * item.qty)}</p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" onClick={() => updateQty(item.key, item.qty - 1)} className="h-8 w-8 rounded-lg border border-rosa/15 font-bold">−</button>
                  <input
                    value={item.qty}
                    onChange={(event) => updateQty(item.key, Number(event.target.value))}
                    inputMode="numeric"
                    className="h-8 w-14 rounded-lg border border-rosa/15 text-center text-xs font-bold"
                  />
                  <button type="button" onClick={() => updateQty(item.key, item.qty + 1)} className="h-8 w-8 rounded-lg border border-rosa/15 font-bold">+</button>
                  <button type="button" onClick={() => updateQty(item.key, 0)} className="ml-auto text-[10px] font-bold text-red-600">Remover</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 border-t border-rosa/10 pt-4">
          <label className="text-[10px] font-bold uppercase text-cinza">Desconto em R$</label>
          <input value={discount} onChange={(event) => setDiscount(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border border-rosa/15 px-3 py-2 text-sm" />
        </div>

        <div className="mt-3 rounded-xl bg-creme/60 p-3 text-sm">
          <div className="flex justify-between"><span className="text-cinza">Subtotal</span><strong>{money(subtotal)}</strong></div>
          {discountValue > 0 && <div className="mt-1 flex justify-between"><span className="text-cinza">Desconto</span><strong>- {money(discountValue)}</strong></div>}
          <div className="mt-2 flex justify-between border-t border-rosa/10 pt-2 text-lg"><span className="font-bold">Total</span><strong className="text-rosa-profundo">{money(total)}</strong></div>
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase text-cinza">Pagamento</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["PIX", "DINHEIRO", "DEBITO", "CREDITO"] as PaymentMethod[]).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${paymentMethod === method ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-rosa/15 text-cinza"}`}
              >
                {method === "DEBITO" ? "Débito" : method === "CREDITO" ? "Crédito" : method === "DINHEIRO" ? "Dinheiro" : "Pix"}
              </button>
            ))}
          </div>
        </div>

        <details className="mt-4 rounded-xl border border-rosa/10 p-3">
          <summary className="cursor-pointer text-xs font-bold text-texto">Cliente e observações (opcional)</summary>
          <div className="mt-3 grid gap-2">
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nome do cliente" className="rounded-xl border border-rosa/15 px-3 py-2 text-xs" />
            <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Telefone/WhatsApp" inputMode="tel" className="rounded-xl border border-rosa/15 px-3 py-2 text-xs" />
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observações da venda" rows={2} className="rounded-xl border border-rosa/15 px-3 py-2 text-xs" />
          </div>
        </details>

        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}

        <button
          type="button"
          disabled={saving || cart.length === 0}
          onClick={finalize}
          className="mt-4 w-full rounded-xl bg-rosa-profundo px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {saving ? "Finalizando..." : `Finalizar venda · ${money(total)}`}
        </button>
        <p className="mt-2 text-center text-[10px] text-cinza">Ao finalizar, o estoque é baixado imediatamente e a venda entra como finalizada.</p>
      </aside>
    </div>
  );
}
