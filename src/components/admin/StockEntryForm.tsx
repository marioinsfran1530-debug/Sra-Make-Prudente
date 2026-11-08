"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { matchesCounterSaleQuery } from "@/lib/counter-sale-search";
import { money } from "@/lib/money";
import {
  ENTRY_ORIGINS,
  allocateFreight,
  entryTotals,
  landedUnitCost,
  parseEntryInput,
  weightedAverageCost,
  type EntryOrigin,
} from "@/lib/stock-entry";

export type EntryProduct = {
  id: string;
  name: string;
  brand: string;
  sku: string | null;
  stockQty: number;
  costPrice: number | null;
  variants: { id: string; name: string; sku: string | null; stockQty: number }[];
};

// Cada produto sem variação, ou cada variação, vira um item que dá para escolher.
type Pickable = {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  brand: string;
  sku: string | null;
  stockItem: number; // estoque do item escolhido
  stockProduct: number; // estoque total do produto (base da média de custo)
  costBefore: number | null;
};

type Line = Pickable & { qtyText: string; costText: string };

const MAX_RESULTS = 8;

function num(text: string) {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() === "" ? Number.NaN : value;
}

function newKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `entry-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function StockEntryForm({ products, today }: { products: EntryProduct[]; today: string }) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [entryDate, setEntryDate] = useState(today);
  const [origin, setOrigin] = useState<EntryOrigin>("shopee");
  const [supplier, setSupplier] = useState("");
  const [freightText, setFreightText] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saleKey] = useState(() => newKey());

  const pickables = useMemo<Pickable[]>(
    () =>
      products.flatMap((product): Pickable[] => {
        if (product.variants.length === 0) {
          return [
            {
              key: `${product.id}:base`,
              productId: product.id,
              variantId: null,
              name: product.name,
              variantName: null,
              brand: product.brand,
              sku: product.sku,
              stockItem: product.stockQty,
              stockProduct: product.stockQty,
              costBefore: product.costPrice,
            },
          ];
        }
        const stockProduct = product.variants.reduce((sum, variant) => sum + Math.max(0, variant.stockQty), 0);
        return product.variants.map((variant) => ({
          key: `${product.id}:${variant.id}`,
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          variantName: variant.name,
          brand: product.brand,
          sku: variant.sku ?? product.sku,
          stockItem: variant.stockQty,
          stockProduct,
          costBefore: product.costPrice,
        }));
      }),
    [products]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const taken = new Set(lines.map((line) => line.key));
    return pickables
      .filter((item) => !taken.has(item.key))
      .filter((item) => matchesCounterSaleQuery([item.name, item.variantName, item.brand, item.sku], query))
      .slice(0, MAX_RESULTS);
  }, [pickables, lines, query]);

  function addLine(item: Pickable) {
    setLines((current) => [...current, { ...item, qtyText: "", costText: item.costBefore !== null ? String(item.costBefore).replace(".", ",") : "" }]);
    setQuery("");
    setError("");
  }

  function patchLine(key: string, patch: Partial<Pick<Line, "qtyText" | "costText">>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  // Prévia por linha: custo com frete e novo custo médio.
  const preview = useMemo(() => {
    const parsed = lines.map((line) => ({ qty: num(line.qtyText), unitCost: num(line.costText) }));
    const valid = parsed.map((line) => Number.isInteger(line.qty) && line.qty > 0 && line.unitCost > 0);
    const freight = Math.max(0, num(freightText) || 0);
    const shares = allocateFreight(
      parsed.map((line, index) => (valid[index] ? line : { qty: 0, unitCost: 0 })),
      freight
    );
    return lines.map((line, index) => {
      if (!valid[index]) return null;
      const landed = landedUnitCost(parsed[index], shares[index]);
      return {
        landed,
        average: weightedAverageCost({
          stockBefore: line.stockProduct,
          costBefore: line.costBefore,
          qty: parsed[index].qty,
          landedUnitCost: landed,
        }),
      };
    });
  }, [lines, freightText]);

  const totals = useMemo(() => {
    const valid = lines
      .map((line) => ({ qty: num(line.qtyText), unitCost: num(line.costText) }))
      .filter((line) => Number.isInteger(line.qty) && line.qty > 0 && line.unitCost > 0);
    return entryTotals(valid, Math.max(0, num(freightText) || 0));
  }, [lines, freightText]);

  async function save() {
    if (saving) return;
    const payload = {
      idempotencyKey: saleKey,
      entryDate,
      origin,
      supplier,
      freight: freightText.trim() === "" ? 0 : num(freightText),
      notes,
      lines: lines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        qty: num(line.qtyText),
        unitCost: num(line.costText),
      })),
    };

    const checked = parseEntryInput(payload, today);
    if ("error" in checked) {
      setError(checked.error);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/stock-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checked.value),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível registrar a entrada.");
      router.push("/admin/produtos/entradas?ok=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar a entrada.");
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-rosa/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa-profundo";

  return (
    <div className="grid gap-4 pb-28 lg:pb-0">
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-texto">Dados da compra</h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[10px] font-bold uppercase text-cinza">Data em que chegou</span>
            <input
              type="date"
              value={entryDate}
              max={today}
              onChange={(event) => setEntryDate(event.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase text-cinza">Fornecedor / loja (opcional)</span>
            <input
              value={supplier}
              maxLength={80}
              onChange={(event) => setSupplier(event.target.value)}
              placeholder="Ex.: Loja X na Shopee"
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>

        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase text-cinza">De onde veio</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {ENTRY_ORIGINS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={origin === item.value}
                onClick={() => setOrigin(item.value)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                  origin === item.value
                    ? "border-rosa-profundo bg-rosa-profundo text-white"
                    : "border-rosa/15 bg-white text-cinza"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-3 block sm:max-w-xs">
          <span className="text-[10px] font-bold uppercase text-cinza">Frete pago (opcional)</span>
          <input
            value={freightText}
            onChange={(event) => setFreightText(event.target.value)}
            inputMode="decimal"
            placeholder="R$ 0,00"
            className={`${inputClass} mt-1`}
          />
          <span className="mt-1 block text-[10px] leading-4 text-cinza">
            O frete é dividido entre os itens e entra no custo de cada um.
          </span>
        </label>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-texto">O que chegou</h2>

        <div className="relative mt-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produto, marca ou SKU"
            aria-label="Buscar produto para adicionar à entrada"
            className={inputClass}
          />
        </div>

        {query.trim() && (
          <div className="mt-2 divide-y divide-rosa/10 overflow-hidden rounded-xl border border-rosa/15">
            {results.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-cinza">Nenhum produto encontrado.</p>
            ) : (
              results.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => addLine(item)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-creme"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-texto">
                      {item.name}
                      {item.variantName ? ` · ${item.variantName}` : ""}
                    </span>
                    <span className="block truncate text-[10px] text-cinza">
                      {item.brand} · estoque {item.stockItem}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-rosa-profundo px-3 py-1.5 text-[11px] font-bold text-white">
                    Adicionar
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {lines.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-rosa/20 p-6 text-center text-xs text-cinza">
            Busque um produto acima para lançar o que chegou.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-rosa/10">
            {lines.map((line, index) => {
              const info = preview[index];
              return (
                <div key={line.key} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-xs font-bold text-texto">
                        {line.name}
                        {line.variantName ? ` · ${line.variantName}` : ""}
                      </p>
                      <p className="mt-0.5 text-[10px] text-cinza">
                        {line.brand} · estoque {line.stockItem} · custo hoje{" "}
                        {line.costBefore !== null ? money(line.costBefore) : "não cadastrado"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                      className="shrink-0 px-1 text-[10px] font-bold text-red-600"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase text-cinza">Quantidade</span>
                      <input
                        value={line.qtyText}
                        onChange={(event) => patchLine(line.key, { qtyText: event.target.value.replace(/\D/g, "").slice(0, 4) })}
                        inputMode="numeric"
                        placeholder="0"
                        aria-label={`Quantidade de ${line.name}`}
                        className={`${inputClass} mt-1 font-bold`}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase text-cinza">Custo unitário</span>
                      <input
                        value={line.costText}
                        onChange={(event) => patchLine(line.key, { costText: event.target.value })}
                        inputMode="decimal"
                        placeholder="R$ 0,00"
                        aria-label={`Custo unitário de ${line.name}`}
                        className={`${inputClass} mt-1 font-bold`}
                      />
                    </label>
                  </div>

                  {info && (
                    <p className="mt-2 rounded-lg bg-creme/70 px-3 py-2 text-[11px] leading-4 text-cinza">
                      Custo com frete <strong className="text-texto">{money(info.landed)}</strong> · novo custo do produto{" "}
                      <strong className="text-rosa-profundo">{money(info.average)}</strong>
                      {line.costBefore !== null && line.stockProduct > 0 ? " (média com o estoque atual)" : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <label className="block">
          <span className="text-[10px] font-bold uppercase text-cinza">Observações (opcional)</span>
          <textarea
            value={notes}
            maxLength={300}
            rows={2}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ex.: pedido #123 da Shopee, nota fiscal…"
            className={`${inputClass} mt-1`}
          />
        </label>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rosa/15 bg-white px-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_24px_rgba(35,20,42,0.08)] lg:static lg:rounded-2xl lg:border lg:px-4 lg:py-3 lg:shadow-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3 lg:max-w-none">
          <div className="min-w-0 flex-1 text-xs text-cinza">
            <p>
              {totals.items} item(ns) · {totals.units} un.
              {totals.freight > 0 ? ` · frete ${money(totals.freight)}` : ""}
            </p>
            <p className="truncate text-sm font-extrabold text-rosa-profundo">Total {money(totals.total)}</p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving || lines.length === 0}
            className="shrink-0 rounded-xl bg-rosa-profundo px-5 py-3 text-xs font-extrabold text-white disabled:opacity-50"
          >
            {saving ? "Registrando..." : "Registrar entrada"}
          </button>
        </div>
      </div>
    </div>
  );
}
