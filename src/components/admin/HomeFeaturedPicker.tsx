"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Plus, X } from "lucide-react";

type ProductOption = {
  id: string;
  name: string;
  brand: string;
  stockQty: number;
  views: number;
  carts: number;
  orders: number;
};

export function HomeFeaturedPicker({
  products,
  selectedIds,
}: {
  products: ProductOption[];
  selectedIds: string[];
}) {
  const router = useRouter();
  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product] as const)),
    [products]
  );
  const validInitial = selectedIds.filter((id) => productMap.has(id)).slice(0, 5);
  const [selected, setSelected] = useState(validInitial);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedProducts = selected
    .map((id) => productMap.get(id))
    .filter((product): product is ProductOption => Boolean(product));

  const suggestions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return products
      .filter((product) => !selectedSet.has(product.id))
      .filter((product) => {
        if (!normalized) return true;
        return `${product.name} ${product.brand}`.toLocaleLowerCase("pt-BR").includes(normalized);
      })
      .slice(0, normalized ? 30 : 12);
  }, [products, query, selectedSet]);

  function add(productId: string) {
    if (selected.length >= 5 || selectedSet.has(productId)) return;
    setSelected((current) => [...current, productId]);
    setMessage(null);
  }

  function remove(productId: string) {
    setSelected((current) => current.filter((id) => id !== productId));
    setMessage(null);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    setSelected((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setMessage(null);
  }

  async function save() {
    if (selected.length !== 5 || saving) return;
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/home-featured", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selected }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar os destaques.");
      setMessage("Home atualizada. Estes 5 produtos agora são os Destaques.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar os destaques.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-rosa/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rosa-profundo">Vitrine principal</p>
          <h2 className="mt-1 font-serif text-xl font-bold text-texto">Escolha 5 Destaques</h2>
          <p className="mt-1 text-xs leading-relaxed text-cinza">
            Toque nos produtos que quer mostrar. A ordem abaixo será a ordem da primeira vitrine da Home.
          </p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${selected.length === 5 ? "bg-green-50 text-green-700" : "bg-creme text-rosa-profundo"}`}>
          {selected.length}/5 escolhidos
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {selectedProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-rosa/20 bg-creme/40 p-4 text-center text-xs text-cinza">
            Nenhum destaque escolhido ainda.
          </div>
        ) : (
          selectedProducts.map((product, index) => (
            <div key={product.id} className="flex items-center gap-3 rounded-2xl border border-rosa/10 bg-creme/35 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rosa-profundo text-xs font-extrabold text-white">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-texto">{product.name}</p>
                <p className="truncate text-[10px] text-cinza">{product.brand} · estoque {product.stockQty}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Subir produto"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-rosa/15 bg-white text-rosa-profundo disabled:opacity-25"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === selectedProducts.length - 1}
                  aria-label="Descer produto"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-rosa/15 bg-white text-rosa-profundo disabled:opacity-25"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(product.id)}
                  aria-label="Remover produto"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={selected.length !== 5 || saving}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rosa-profundo px-4 text-sm font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Check size={16} />
        {saving ? "Salvando..." : selected.length === 5 ? "Salvar 5 destaques na Home" : `Escolha mais ${5 - selected.length}`}
      </button>

      {message && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-creme px-3 py-2 text-xs text-texto">
          <span>{message}</span>
          {message.startsWith("Home atualizada") && (
            <Link href="/" target="_blank" className="shrink-0 font-bold text-rosa-profundo underline underline-offset-2">
              Ver Home
            </Link>
          )}
        </div>
      )}

      <div className="mt-5 border-t border-rosa/10 pt-4">
        <label htmlFor="featured-search" className="text-xs font-bold text-texto">Trocar produto</label>
        <input
          id="featured-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome ou marca"
          className="mt-2 min-h-11 w-full rounded-xl border border-rosa/15 bg-white px-3 text-sm text-texto outline-none focus:border-rosa-profundo"
        />

        <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-cinza">
          {query.trim() ? "Resultados" : "Sugestões pelos dados do período"}
        </p>
        <div className="mt-2 space-y-2">
          {suggestions.length === 0 ? (
            <p className="rounded-xl bg-creme/40 p-3 text-xs text-cinza">Nenhum produto encontrado.</p>
          ) : (
            suggestions.map((product) => (
              <div key={product.id} className="flex items-center gap-3 rounded-2xl border border-rosa/10 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-texto">{product.name}</p>
                  <p className="mt-0.5 truncate text-[10px] text-cinza">
                    {product.brand} · {product.views} vistas · {product.carts} carrinhos · {product.orders} pedidos · estoque {product.stockQty}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => add(product.id)}
                  disabled={selected.length >= 5}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-xl border border-rosa/20 bg-white px-3 text-[11px] font-bold text-rosa-profundo disabled:opacity-30"
                >
                  <Plus size={13} /> Escolher
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
