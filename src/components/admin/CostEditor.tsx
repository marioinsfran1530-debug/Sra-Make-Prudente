"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/money";
import { estimatedCost, marginPct, MIN_MARGIN_PCT } from "@/lib/pricing";

export type CostRow = {
  id: string;
  name: string;
  brand: string;
  price: number;
  costPrice: number | null;
  stockQty: number;
  unitsSold: number;
};

type Filter = "sem-custo" | "todos";

function parseMoney(value: string) {
  const cleaned = value.trim().replace(/\s/g, "").replace("R$", "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function formatInput(value: number | null) {
  return value === null ? "" : value.toFixed(2).replace(".", ",");
}

export function CostEditor({ rows: initialRows, periodLabel }: { rows: CostRow[]; periodLabel: string }) {
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<Filter>("sem-custo");
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});

  const total = rows.length;
  const withCost = rows.filter((row) => row.costPrice !== null).length;
  const soldRows = rows.filter((row) => row.unitsSold > 0);
  const soldWithCost = soldRows.filter((row) => row.costPrice !== null).length;

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "sem-custo" && row.costPrice !== null) return false;
      if (!normalized) return true;
      return `${row.name} ${row.brand}`.toLowerCase().includes(normalized);
    });
  }, [rows, filter, query]);

  async function save(row: CostRow, rawValue: string) {
    const parsed = parseMoney(rawValue);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
      setErrors((current) => ({ ...current, [row.id]: "Informe um valor válido." }));
      return;
    }
    if (parsed !== null && parsed >= row.price * 1.5) {
      // Evita erro de digitação grosseiro (custo muito acima do preço de venda).
      const ok = window.confirm(
        `O custo (${money(parsed)}) está muito acima do preço de venda (${money(row.price)}). Confirmar mesmo assim?`
      );
      if (!ok) return;
    }

    setSavingId(row.id);
    setErrors((current) => ({ ...current, [row.id]: "" }));
    try {
      const response = await fetch(`/api/admin/products/${row.id}/cost`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ costPrice: parsed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar o custo.");

      const saved: number | null = data.product?.costPrice ?? null;
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, costPrice: saved } : item)));
      setDrafts((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      setSavedIds((current) => ({ ...current, [row.id]: true }));
      window.setTimeout(() => setSavedIds((current) => ({ ...current, [row.id]: false })), 2500);
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [row.id]: err instanceof Error ? err.message : "Erro ao salvar.",
      }));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <section className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Produtos que vendem</p>
          <p className="mt-1 text-xl font-extrabold text-texto">
            {soldWithCost}/{soldRows.length}
          </p>
          <p className="mt-1 text-[10px] text-cinza">com custo real ({periodLabel})</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Catálogo ativo</p>
          <p className="mt-1 text-xl font-extrabold text-texto">
            {withCost}/{total}
          </p>
          <p className="mt-1 text-[10px] text-cinza">com custo real</p>
        </div>
      </section>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("sem-custo")}
          className={`rounded-xl border px-3 py-2 text-xs font-bold ${
            filter === "sem-custo" ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-rosa/15 bg-white text-cinza"
          }`}
        >
          Sem custo ({total - withCost})
        </button>
        <button
          type="button"
          onClick={() => setFilter("todos")}
          className={`rounded-xl border px-3 py-2 text-xs font-bold ${
            filter === "todos" ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-rosa/15 bg-white text-cinza"
          }`}
        >
          Todos
        </button>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar produto ou marca"
          className="min-w-0 flex-1 rounded-xl border border-rosa/15 bg-white px-3 py-2 text-xs"
        />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rosa/20 bg-creme/40 p-5 text-sm text-cinza">
          {filter === "sem-custo" ? "Todos os produtos listados já têm custo. 🎉" : "Nenhum produto encontrado."}
        </div>
      ) : (
        <ul className="grid gap-2">
          {visible.map((row) => {
            const draft = drafts[row.id];
            const inputValue = draft ?? formatInput(row.costPrice);
            const parsedDraft = draft !== undefined ? parseMoney(draft) : row.costPrice;
            const isEstimated = parsedDraft === null || Number.isNaN(parsedDraft);
            const costForMargin = isEstimated ? estimatedCost(row.price) : (parsedDraft as number);
            const margin = marginPct(row.price, costForMargin);
            const lowMargin = !isEstimated && margin < MIN_MARGIN_PCT;
            const dirty = draft !== undefined && draft !== formatInput(row.costPrice);

            return (
              <li key={row.id} className="rounded-2xl border border-rosa/10 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/produtos/${row.id}`}
                      className="block text-sm font-bold text-texto hover:text-rosa-profundo hover:underline"
                    >
                      {row.name}
                    </Link>
                    <p className="mt-0.5 text-[10px] text-cinza">
                      {row.brand} · preço {money(row.price)} · estoque {row.stockQty}
                      {row.unitsSold > 0 ? ` · ${row.unitsSold} vendido${row.unitsSold === 1 ? "" : "s"}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${
                      isEstimated
                        ? "bg-amber-50 text-amber-800"
                        : lowMargin
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-800"
                    }`}
                  >
                    {isEstimated ? "estimado" : "real"} · margem {margin.toFixed(0).replace(".", ",")}%
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <label className="sr-only" htmlFor={`cost-${row.id}`}>
                    Custo de {row.name}
                  </label>
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-cinza">R$</span>
                    <input
                      id={`cost-${row.id}`}
                      inputMode="decimal"
                      value={inputValue}
                      onChange={(event) => setDrafts((current) => ({ ...current, [row.id]: event.target.value }))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void save(row, inputValue);
                      }}
                      placeholder={`${formatInput(estimatedCost(row.price))} (estimado)`}
                      className="w-full rounded-xl border border-rosa/15 py-2.5 pl-9 pr-3 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!dirty || savingId === row.id}
                    onClick={() => void save(row, inputValue)}
                    className="shrink-0 rounded-xl bg-rosa-profundo px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-40"
                  >
                    {savingId === row.id ? "Salvando…" : savedIds[row.id] ? "Salvo ✓" : "Salvar"}
                  </button>
                </div>

                {errors[row.id] && (
                  <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700">{errors[row.id]}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-[10px] leading-4 text-cinza">
        Enquanto o custo real não é informado, a margem mostrada usa a regra da loja (custo de 44% do preço) e fica marcada como
        estimada. O custo informado aqui passa a valer nas próximas vendas; vendas já finalizadas não mudam.
      </p>
    </div>
  );
}
