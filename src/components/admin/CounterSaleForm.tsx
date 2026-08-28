"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  category: { id: string; name: string; slug: string } | null;
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
type LastAddition = { key: string; previousQty: number } | null;
type Tab = "FAVORITOS" | "TODOS" | string;

const FAVORITES_KEY = "sramake_counter_sale_favorites_v1";

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

function parseMoney(value: string) {
  let normalized = value.trim().replace(/\s/g, "");
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function productPrice(product: Product, variant?: Variant | null) {
  if (variant) {
    if (variant.promoPrice !== null) return variant.promoPrice;
    if (variant.price !== null) return variant.price;
  }
  return product.promoPrice ?? product.price;
}

function productAvailable(product: Product) {
  return product.variants.length > 0
    ? product.variants.reduce((sum, variant) => sum + Math.max(0, variant.stockQty), 0)
    : Math.max(0, product.stockQty);
}

function newSaleToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `sale-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function CounterSaleForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [cashReceived, setCashReceived] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("TODOS");
  const [lastAddition, setLastAddition] = useState<LastAddition>(null);
  const [saleToken, setSaleToken] = useState(() => newSaleToken());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((id): id is string => typeof id === "string" && products.some((p) => p.id === id));
        setFavoriteIds(valid);
        if (valid.length > 0) setActiveTab("FAVORITOS");
      }
    } catch {
      // Favoritos são conveniência local; falha de storage não bloqueia a venda.
    }
  }, [products]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; slug: string }>();
    products.forEach((product) => {
      if (product.category) map.set(product.category.id, product.category);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [products]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    let base = products;

    if (activeTab === "FAVORITOS") {
      base = products.filter((product) => favoriteIds.includes(product.id));
    } else if (activeTab !== "TODOS") {
      base = products.filter((product) => product.category?.id === activeTab);
    }

    if (!q) return base.slice(0, 30);

    return base
      .filter((product) => {
        const fields = [
          product.name,
          product.brand,
          product.sku ?? "",
          ...product.variants.map((variant) => `${variant.name} ${variant.sku ?? ""}`),
        ];
        return fields.some((field) => normalize(field).includes(q));
      })
      .slice(0, 40);
  }, [activeTab, favoriteIds, products, query]);

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const discountValue = Math.max(0, parseMoney(discount));
  const total = Math.max(0, subtotal - discountValue);
  const receivedValue = Math.max(0, parseMoney(cashReceived));
  const cashShort = paymentMethod === "DINHEIRO" && receivedValue + 0.0001 < total;
  const change = paymentMethod === "DINHEIRO" ? Math.max(0, receivedValue - total) : 0;

  function focusSearch() {
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function persistFavorites(next: string[]) {
    setFavoriteIds(next);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {
      // Não bloqueia o PDV.
    }
  }

  function toggleFavorite(productId: string) {
    const next = favoriteIds.includes(productId)
      ? favoriteIds.filter((id) => id !== productId)
      : [...favoriteIds, productId];
    persistFavorites(next);
    if (activeTab === "FAVORITOS" && next.length === 0) setActiveTab("TODOS");
  }

  function addLine(product: Product, variant: Variant | null) {
    const stockQty = variant ? variant.stockQty : product.stockQty;
    if (stockQty <= 0) {
      setError("Este item está sem estoque.");
      focusSearch();
      return;
    }

    const key = `${product.id}:${variant?.id ?? "base"}`;
    const existing = cart.find((item) => item.key === key);

    if (existing && existing.qty >= stockQty) {
      setError("A quantidade já atingiu o estoque disponível.");
      focusSearch();
      return;
    }

    setLastAddition({ key, previousQty: existing?.qty ?? 0 });
    setCart((current) => {
      const currentLine = current.find((item) => item.key === key);
      if (currentLine) {
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
    focusSearch();
  }

  function chooseProduct(product: Product) {
    if (productAvailable(product) <= 0) {
      setError("Este produto está sem estoque.");
      return;
    }
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
    setLastAddition(null);
    setCart((current) =>
      current
        .map((item) => (item.key === key ? { ...item, qty: Math.min(item.stockQty, Math.max(0, next)) } : item))
        .filter((item) => item.qty > 0)
    );
  }

  function undoLastAddition() {
    if (!lastAddition) return;
    setCart((current) => {
      if (lastAddition.previousQty <= 0) {
        return current.filter((item) => item.key !== lastAddition.key);
      }
      return current.map((item) =>
        item.key === lastAddition.key ? { ...item, qty: lastAddition.previousQty } : item
      );
    });
    setLastAddition(null);
    setError("");
    focusSearch();
  }

  function tryExactScan() {
    const exact = normalize(query);
    if (!exact) return false;

    const matches: Array<{ product: Product; variant: Variant | null }> = [];
    products.forEach((product) => {
      if (product.sku && normalize(product.sku) === exact) matches.push({ product, variant: null });
      product.variants.forEach((variant) => {
        if (variant.sku && normalize(variant.sku) === exact) matches.push({ product, variant });
      });
    });

    if (matches.length !== 1) return false;
    const match = matches[0];
    if (match.variant) {
      addLine(match.product, match.variant);
      return true;
    }
    if (match.product.variants.length > 0) {
      setError("O código pertence ao produto, mas é necessário escolher a variação.");
      return true;
    }
    addLine(match.product, null);
    return true;
  }

  function setPayment(method: PaymentMethod) {
    setPaymentMethod(method);
    if (method !== "DINHEIRO") setCashReceived("");
  }

  function setReceivedPreset(value: number) {
    setCashReceived(value.toFixed(2).replace(".", ","));
  }

  async function finalize() {
    if (saving) return;
    setError("");
    if (cart.length === 0) {
      setError("Adicione produtos antes de finalizar.");
      return;
    }
    if (discountValue > subtotal) {
      setError("O desconto não pode ser maior que o subtotal.");
      return;
    }
    if (paymentMethod === "DINHEIRO" && receivedValue + 0.0001 < total) {
      setError("O valor recebido é menor que o total da venda.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/counter-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: saleToken,
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
      setCashReceived("");
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      setLastAddition(null);
      setSaleToken(newSaleToken());
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
      <section className="min-w-0 rounded-2xl bg-white p-4 shadow-sm">
        <label className="text-xs font-bold text-texto">Buscar produto, marca, SKU ou EAN</label>
        <input
          ref={searchRef}
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (!tryExactScan() && filtered.length === 1) chooseProduct(filtered[0]);
            }
          }}
          placeholder="Digite ou leia o código de barras..."
          className="mt-2 w-full rounded-xl border border-rosa/20 px-4 py-3 text-sm outline-none focus:border-rosa-profundo"
        />
        <p className="mt-1 text-[10px] text-cinza">EAN/SKU exato + Enter adiciona automaticamente quando houver correspondência única.</p>

        <div className="sticky top-0 z-10 -mx-1 mt-3 bg-white/95 px-1 py-2 backdrop-blur">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {favoriteIds.length > 0 && (
              <button type="button" onClick={() => setActiveTab("FAVORITOS")} className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-bold ${activeTab === "FAVORITOS" ? "bg-rosa-profundo text-white" : "bg-creme text-cinza"}`}>
                ★ Favoritos ({favoriteIds.length})
              </button>
            )}
            <button type="button" onClick={() => setActiveTab("TODOS")} className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-bold ${activeTab === "TODOS" ? "bg-rosa-profundo text-white" : "bg-creme text-cinza"}`}>
              Todos
            </button>
            {categories.map((category) => (
              <button key={category.id} type="button" onClick={() => setActiveTab(category.id)} className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-bold ${activeTab === category.id ? "bg-rosa-profundo text-white" : "bg-creme text-cinza"}`}>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => {
            const available = productAvailable(product);
            const isFavorite = favoriteIds.includes(product.id);
            return (
              <div key={product.id} className={`relative rounded-xl border p-3 ${available > 0 ? "border-rosa/10" : "border-gray-200 bg-gray-50 opacity-65"}`}>
                <button type="button" onClick={() => toggleFavorite(product.id)} aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} className="absolute right-2 top-2 z-[1] rounded-full bg-white px-2 py-1 text-sm shadow-sm">
                  {isFavorite ? "★" : "☆"}
                </button>
                <button type="button" disabled={available <= 0} onClick={() => chooseProduct(product)} className="w-full pr-7 text-left disabled:cursor-not-allowed">
                  <p className="line-clamp-2 text-sm font-bold text-texto">{product.name}</p>
                  <p className="mt-0.5 text-[10px] text-cinza">{product.brand}{product.sku ? ` · ${product.sku}` : ""}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-rosa-profundo">{money(productPrice(product))}</span>
                    <span className={`text-[10px] font-bold ${available > 0 ? "text-green-700" : "text-red-600"}`}>{available > 0 ? `Estoque ${available}` : "Sem estoque"}</span>
                  </div>
                </button>
                {product.variants.length > 1 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-rosa/10 pt-2">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        disabled={variant.stockQty <= 0}
                        aria-disabled={variant.stockQty <= 0}
                        onClick={() => addLine(product, variant)}
                        className="rounded-lg border border-rosa/15 px-2 py-1.5 text-[10px] font-bold text-rosa-profundo disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-60"
                      >
                        {variant.name} · {variant.stockQty}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-rosa/20 p-6 text-center text-xs text-cinza">
              Nenhum produto encontrado nesta seção.
            </div>
          )}
        </div>
      </section>

      <aside className="h-fit rounded-2xl bg-white p-4 shadow-sm lg:sticky lg:top-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-texto">Venda atual</h2>
            <span className="text-xs text-cinza">{cart.reduce((sum, item) => sum + item.qty, 0)} item(ns)</span>
          </div>
          <button type="button" disabled={!lastAddition} onClick={undoLastAddition} className="rounded-lg border border-rosa/15 px-2 py-1.5 text-[10px] font-bold text-rosa-profundo disabled:opacity-35">
            ↶ Desfazer último
          </button>
        </div>

        <div className="mt-3 max-h-[36vh] divide-y divide-rosa/10 overflow-y-auto pr-1 lg:max-h-[42vh]">
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
                  <button type="button" onClick={() => updateQty(item.key, item.qty - 1)} className="h-9 w-9 rounded-lg border border-rosa/15 font-bold">−</button>
                  <input value={item.qty} onChange={(event) => updateQty(item.key, Number(event.target.value))} inputMode="numeric" className="h-9 w-14 rounded-lg border border-rosa/15 text-center text-xs font-bold" />
                  <button type="button" onClick={() => updateQty(item.key, item.qty + 1)} className="h-9 w-9 rounded-lg border border-rosa/15 font-bold">+</button>
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
              <button key={method} type="button" onClick={() => setPayment(method)} className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${paymentMethod === method ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-rosa/15 text-cinza"}`}>
                {method === "DEBITO" ? "Débito" : method === "CREDITO" ? "Crédito" : method === "DINHEIRO" ? "Dinheiro" : "Pix"}
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === "DINHEIRO" && (
          <div className="mt-3 rounded-xl border border-rosa/15 p-3">
            <label className="text-[10px] font-bold uppercase text-cinza">Valor recebido</label>
            <input value={cashReceived} onChange={(event) => setCashReceived(event.target.value)} inputMode="decimal" placeholder="0,00" className="mt-1 w-full rounded-xl border border-rosa/15 px-3 py-2.5 text-base font-bold" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setReceivedPreset(total)} className="rounded-lg bg-creme px-2 py-1.5 text-[10px] font-bold">Valor exato</button>
              {[5, 10, 20].map((extra) => (
                <button key={extra} type="button" onClick={() => setReceivedPreset(total + extra)} className="rounded-lg bg-creme px-2 py-1.5 text-[10px] font-bold">+ R$ {extra}</button>
              ))}
            </div>
            <div className={`mt-3 rounded-lg px-3 py-2 ${cashShort ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {cashShort ? (
                <p className="text-xs font-bold">Faltam {money(Math.max(0, total - receivedValue))}</p>
              ) : (
                <div className="flex items-center justify-between"><span className="text-xs font-bold">Troco</span><strong className="text-lg">{money(change)}</strong></div>
              )}
            </div>
          </div>
        )}

        <details className="mt-4 rounded-xl border border-rosa/10 p-3">
          <summary className="cursor-pointer text-xs font-bold text-texto">Cliente e observações (opcional)</summary>
          <div className="mt-3 grid gap-2">
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nome do cliente" className="rounded-xl border border-rosa/15 px-3 py-2 text-xs" />
            <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Telefone/WhatsApp" inputMode="tel" className="rounded-xl border border-rosa/15 px-3 py-2 text-xs" />
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observações da venda" rows={2} className="rounded-xl border border-rosa/15 px-3 py-2 text-xs" />
          </div>
        </details>

        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}

        <button type="button" disabled={saving || cart.length === 0 || cashShort} onClick={finalize} className="mt-4 w-full rounded-xl bg-rosa-profundo px-4 py-3.5 text-sm font-extrabold text-white disabled:opacity-50">
          {saving ? "Finalizando..." : `Finalizar venda · ${money(total)}`}
        </button>
        <p className="mt-2 text-center text-[10px] text-cinza">Ao finalizar, o estoque é baixado imediatamente e a venda entra como finalizada.</p>
      </aside>
    </div>
  );
}
