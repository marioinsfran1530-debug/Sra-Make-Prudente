"use client";

import { useMemo, useState } from "react";

type ProductOption = {
  id: string;
  name: string;
  brand: string;
  price: number;
  stockQty: number;
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function ProductPicker({ products }: { products: ProductOption[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const filtered = useMemo(() => {
    const term = normalize(query);
    const rows = term
      ? products.filter((product) =>
          normalize(`${product.name} ${product.brand}`).includes(term),
        )
      : products;

    return rows.slice(0, 12);
  }, [products, query]);

  const selected = products.find((product) => product.id === selectedId);

  return (
    <div>
      <input type="hidden" name="productId" value={selectedId} required />

      <label htmlFor="crm-product-search" className="block text-xs font-bold text-texto">
        Produto indicado
      </label>

      <div className="mt-1 relative">
        <input
          id="crm-product-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar produto ou marca"
          autoComplete="off"
          className="w-full rounded-xl border border-rosa/20 bg-white px-3 py-3 pr-10 text-base outline-none focus:border-rosa-profundo sm:text-sm"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-lg leading-none text-cinza"
          >
            ×
          </button>
        )}
      </div>

      {selected && (
        <div className="mt-2 flex items-start justify-between gap-3 rounded-xl border border-rosa-profundo/30 bg-rosa/5 px-3 py-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-texto">Selecionado</p>
            <p className="mt-0.5 text-sm font-bold text-rosa-profundo">{selected.name}</p>
            <p className="mt-1 text-[11px] text-cinza">{selected.brand} · {money(selected.price)} · estoque {selected.stockQty}</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedId("")}
            className="shrink-0 rounded-lg border border-rosa/20 px-2.5 py-1.5 text-[10px] font-bold text-cinza"
          >
            Trocar
          </button>
        </div>
      )}

      <div className="mt-2 max-h-80 space-y-2 overflow-y-auto overscroll-contain pr-1">
        {filtered.map((product) => {
          const active = product.id === selectedId;
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => setSelectedId(product.id)}
              className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? "border-rosa-profundo bg-rosa/5"
                  : "border-rosa/10 bg-white active:bg-creme"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-snug text-texto">{product.name}</p>
                  <p className="mt-1 text-[11px] text-cinza">{product.brand}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-extrabold text-rosa-profundo">{money(product.price)}</p>
                  <p className={`mt-1 text-[10px] font-bold ${product.stockQty > 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {product.stockQty > 0 ? `${product.stockQty} em estoque` : "Sem estoque"}
                  </p>
                </div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-rosa/20 px-3 py-6 text-center text-xs text-cinza">
            Nenhum produto encontrado. Tente outro nome ou marca.
          </div>
        )}
      </div>

      <p className="mt-2 text-[10px] text-cinza">
        {query
          ? `${filtered.length} resultado${filtered.length === 1 ? "" : "s"} exibido${filtered.length === 1 ? "" : "s"}.`
          : "Digite para localizar qualquer produto do catálogo. Mostrando os primeiros 12."}
      </p>
    </div>
  );
}
