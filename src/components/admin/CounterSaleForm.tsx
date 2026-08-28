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
  imageUrl: string | null;
};

type PaymentMethod = "PIX" | "DINHEIRO" | "DEBITO" | "CREDITO";
type LastAddition = { key: string; previousQty: number } | null;
type Tab = "FAVORITOS" | "TODOS" | string;

const FAVORITES_KEY = "sramake_counter_sale_favorites_v1";
const PAGE_SIZE = 16;

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
  const [cartOpen, setCartOpen] = useState(false);
  const [variantPicker, setVariantPicker] = useState<Product | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab, query]);

  useEffect(() => {
    if (!cartOpen && !variantPicker) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [cartOpen, variantPicker]);

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

    if (!q) return base;

    return base.filter((product) => {
      const fields = [
        product.name,
        product.brand,
        product.sku ?? "",
        ...product.variants.map((variant) => `${variant.name} ${variant.sku ?? ""}`),
      ];
      return fields.some((field) => normalize(field).includes(q));
    });
  }, [activeTab, favoriteIds, products, query]);

  const visibleProducts = filtered.slice(0, visibleCount);
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const discountValue = Math.max(0, parseMoney(discount));
  const total = Math.max(0, subtotal - discountValue);
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
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
          imageUrl: product.imageUrl,
        },
      ];
    });
    setError("");
    setQuery("");
    setVariantPicker(null);
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
    setVariantPicker(product);
    setError("");
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
      setVariantPicker(match.product);
      setError("");
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
      setCartOpen(false);
      router.push(`/admin/pedidos/${data.order.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao finalizar venda.");
    } finally {
      setSaving(false);
    }
  }

  function renderSalePanel(mobile = false) {
    return (
      <div className={mobile ? "flex min-h-0 flex-1 flex-col" : ""}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-texto">Venda atual</h2>
            <span className="text-xs text-cinza">{itemCount} item(ns)</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" disabled={!lastAddition} onClick={undoLastAddition} className="rounded-lg border border-rosa/15 px-2 py-1.5 text-[10px] font-bold text-rosa-profundo disabled:opacity-35">
              ↶ Desfazer último
            </button>
            {mobile && (
              <button type="button" onClick={() => setCartOpen(false)} aria-label="Fechar venda atual" className="flex h-9 w-9 items-center justify-center rounded-full border border-rosa/10 text-lg text-cinza">
                ×
              </button>
            )}
          </div>
        </div>

        <div className={`${mobile ? "max-h-[34dvh]" : "max-h-[34vh] lg:max-h-[36vh]"} mt-3 divide-y divide-rosa/10 overflow-y-auto pr-1`}>
          {cart.length === 0 ? (
            <p className="py-6 text-center text-xs text-cinza">Nenhum produto adicionado.</p>
          ) : (
            cart.map((item) => (
              <div key={item.key} className="flex gap-3 py-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-creme">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="h-full w-full object-contain p-1" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-cinza">Sem foto</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-xs font-bold text-texto">{item.name}</p>
                      {item.variantName && <p className="mt-0.5 text-[10px] text-cinza">{item.variantName}</p>}
                      <p className="mt-1 text-[10px] font-bold text-rosa-profundo">{money(item.unitPrice)}</p>
                    </div>
                    <p className="shrink-0 text-xs font-extrabold text-texto">{money(item.unitPrice * item.qty)}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <button type="button" onClick={() => updateQty(item.key, item.qty - 1)} className="h-8 w-8 rounded-lg border border-rosa/15 font-bold">−</button>
                    <input value={item.qty} onChange={(event) => updateQty(item.key, Number(event.target.value))} inputMode="numeric" className="h-8 w-12 rounded-lg border border-rosa/15 text-center text-xs font-bold" />
                    <button type="button" onClick={() => updateQty(item.key, item.qty + 1)} className="h-8 w-8 rounded-lg border border-rosa/15 font-bold">+</button>
                    <button type="button" onClick={() => updateQty(item.key, 0)} className="ml-auto px-1 text-[10px] font-bold text-red-600">Remover</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 border-t border-rosa/10 pt-3">
          <label className="text-[10px] font-bold uppercase text-cinza">Desconto em R$</label>
          <input value={discount} onChange={(event) => setDiscount(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border border-rosa/15 px-3 py-2 text-sm" />
        </div>

        <div className="mt-3 rounded-xl bg-creme/60 p-3 text-sm">
          <div className="flex justify-between"><span className="text-cinza">Subtotal</span><strong>{money(subtotal)}</strong></div>
          {discountValue > 0 && <div className="mt-1 flex justify-between"><span className="text-cinza">Desconto</span><strong>- {money(discountValue)}</strong></div>}
          <div className="mt-2 flex justify-between border-t border-rosa/10 pt-2 text-lg"><span className="font-bold">Total</span><strong className="text-rosa-profundo">{money(total)}</strong></div>
        </div>

        <div className="mt-3">
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

        <details className="mt-3 rounded-xl border border-rosa/10 p-3">
          <summary className="cursor-pointer text-xs font-bold text-texto">Cliente e observações (opcional)</summary>
          <div className="mt-3 grid gap-2">
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nome do cliente" className="rounded-xl border border-rosa/15 px-3 py-2 text-xs" />
            <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Telefone/WhatsApp" inputMode="tel" className="rounded-xl border border-rosa/15 px-3 py-2 text-xs" />
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observações da venda" rows={2} className="rounded-xl border border-rosa/15 px-3 py-2 text-xs" />
          </div>
        </details>

        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}

        <div className={mobile ? "sticky bottom-0 -mx-4 mt-4 border-t border-rosa/10 bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3" : ""}>
          <button type="button" disabled={saving || cart.length === 0 || cashShort} onClick={finalize} className="w-full rounded-xl bg-rosa-profundo px-4 py-3.5 text-sm font-extrabold text-white disabled:opacity-50">
            {saving ? "Finalizando..." : `Finalizar venda · ${money(total)}`}
          </button>
          <p className="mt-2 text-center text-[10px] text-cinza">Estoque baixado e venda registrada ao finalizar.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 pb-24 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:pb-0">
        <section className="min-w-0 overflow-visible rounded-2xl bg-white shadow-sm">
          <div className="sticky top-0 z-20 rounded-t-2xl border-b border-rosa/10 bg-white/95 p-3 backdrop-blur sm:p-4">
            <label className="sr-only">Buscar produto, marca, SKU ou EAN</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-cinza">⌕</span>
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
                placeholder="Buscar produto, marca, SKU ou EAN"
                className="w-full rounded-xl border border-rosa/20 py-3 pl-9 pr-3 text-sm outline-none focus:border-rosa-profundo"
              />
            </div>
            <p className="mt-1 hidden text-[10px] text-cinza sm:block">EAN/SKU exato + Enter adiciona automaticamente.</p>

            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {favoriteIds.length > 0 && (
                <button type="button" onClick={() => setActiveTab("FAVORITOS")} className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-bold ${activeTab === "FAVORITOS" ? "bg-rosa-profundo text-white" : "bg-creme text-cinza"}`}>
                  ★ Favoritos
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

          <div className="p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-texto">
                {activeTab === "FAVORITOS" ? "Favoritos" : activeTab === "TODOS" ? "Todos os produtos" : categories.find((category) => category.id === activeTab)?.name ?? "Produtos"}
              </p>
              <span className="text-[10px] text-cinza">{filtered.length} encontrado(s)</span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((product) => {
                const available = productAvailable(product);
                const isFavorite = favoriteIds.includes(product.id);
                return (
                  <article key={product.id} className={`relative overflow-hidden rounded-xl border bg-white ${available > 0 ? "border-rosa/10" : "border-gray-200 opacity-60"}`}>
                    <button type="button" onClick={() => toggleFavorite(product.id)} aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-base text-rosa-profundo shadow">
                      {isFavorite ? "★" : "☆"}
                    </button>
                    <button type="button" disabled={available <= 0} onClick={() => chooseProduct(product)} className="w-full text-left disabled:cursor-not-allowed">
                      <div className="aspect-[4/3] w-full bg-creme/70">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain p-2" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] font-semibold text-cinza">Sem foto</div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="line-clamp-2 min-h-9 text-xs font-bold leading-4 text-texto">{product.name}</p>
                        <p className="mt-0.5 truncate text-[10px] text-cinza">{product.brand}</p>
                        <div className="mt-2 flex items-end justify-between gap-1">
                          <span className="text-sm font-extrabold text-rosa-profundo">{money(productPrice(product))}</span>
                          <span className={`text-[9px] font-bold ${available > 0 ? "text-green-700" : "text-red-600"}`}>{available > 0 ? `Est. ${available}` : "Sem estoque"}</span>
                        </div>
                        {product.variants.length > 1 && available > 0 && (
                          <p className="mt-1.5 text-[9px] font-bold text-rosa-profundo">Escolher entre {product.variants.length} opções</p>
                        )}
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="rounded-xl border border-dashed border-rosa/20 p-8 text-center text-xs text-cinza">
                Nenhum produto encontrado nesta seção.
              </div>
            )}

            {visibleCount < filtered.length && (
              <div className="mt-4 flex justify-center">
                <button type="button" onClick={() => setVisibleCount((current) => current + PAGE_SIZE)} className="rounded-full border border-rosa-profundo/20 bg-white px-5 py-2.5 text-xs font-bold text-rosa-profundo">
                  Carregar mais produtos
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="hidden h-fit rounded-2xl bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:block">
          {renderSalePanel(false)}
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rosa/15 bg-white/95 px-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_24px_rgba(35,20,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button type="button" onClick={() => setCartOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-creme text-lg">🛍️
              {itemCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rosa-profundo px-1 text-[9px] font-bold text-white">{itemCount}</span>}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-cinza">{itemCount} item(ns)</p>
              <p className="truncate text-sm font-extrabold text-rosa-profundo">{money(total)}</p>
            </div>
          </button>
          <button type="button" onClick={() => setCartOpen(true)} className="shrink-0 rounded-xl bg-rosa-profundo px-5 py-3 text-xs font-bold text-white">
            Ver venda
          </button>
        </div>
      </div>

      {cartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fechar venda atual" onClick={() => setCartOpen(false)} className="absolute inset-0 bg-black/35" />
          <section className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-3xl bg-white p-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gray-300" />
            <div className="min-h-0 overflow-y-auto">
              {renderSalePanel(true)}
            </div>
          </section>
        </div>
      )}

      {variantPicker && (
        <div className="fixed inset-0 z-[60]">
          <button type="button" aria-label="Fechar seleção de variação" onClick={() => { setVariantPicker(null); focusSearch(); }} className="absolute inset-0 bg-black/35" />
          <section className="absolute inset-x-0 bottom-0 mx-auto max-h-[80dvh] max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(92vw,520px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-creme">
                {variantPicker.imageUrl ? <img src={variantPicker.imageUrl} alt={variantPicker.name} className="h-full w-full object-contain p-1.5" /> : <div className="flex h-full items-center justify-center text-[9px] text-cinza">Sem foto</div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-rosa-profundo">Escolha a opção</p>
                <h3 className="mt-1 text-sm font-bold text-texto">{variantPicker.name}</h3>
                <p className="mt-0.5 text-[10px] text-cinza">{variantPicker.brand}</p>
              </div>
              <button type="button" onClick={() => { setVariantPicker(null); focusSearch(); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rosa/10 text-lg text-cinza">×</button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {variantPicker.variants.map((variant) => (
                <button key={variant.id} type="button" disabled={variant.stockQty <= 0} onClick={() => addLine(variantPicker, variant)} className="flex items-center justify-between gap-3 rounded-xl border border-rosa/15 px-3 py-3 text-left disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-texto">{variant.name}</p>
                    <p className="mt-0.5 text-[10px] text-cinza">Estoque {variant.stockQty}</p>
                  </div>
                  <strong className="shrink-0 text-xs text-rosa-profundo">{money(productPrice(variantPicker, variant))}</strong>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
