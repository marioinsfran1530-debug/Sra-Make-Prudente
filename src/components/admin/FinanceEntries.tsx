"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/money";
import { FINANCE_KINDS, parseMoneyInput, type FinanceEntryRow, type FinanceKind } from "@/lib/finance";

type Draft = { label: string; amount: string };

function formatAmount(value: number) {
  return value.toFixed(2).replace(".", ",");
}

async function request(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error || "Não foi possível salvar.");
  return data;
}

export function FinanceEntries({
  month,
  entries,
  previousHasFixed,
}: {
  month: string;
  entries: FinanceEntryRow[];
  previousHasFixed: boolean;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [adds, setAdds] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError("");
    try {
      await action();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setBusy(null);
    }
  }

  function saveRow(entry: FinanceEntryRow) {
    const draft = drafts[entry.id];
    if (!draft) return;
    const amount = parseMoneyInput(draft.amount);
    if (amount === null) {
      setError("Informe um valor válido, como 90 ou 1.234,56.");
      return;
    }
    void run(entry.id, async () => {
      await request(`/api/admin/finance/entries/${entry.id}`, "PATCH", { label: draft.label, amount });
      setDrafts((current) => {
        const next = { ...current };
        delete next[entry.id];
        return next;
      });
    });
  }

  function removeRow(entry: FinanceEntryRow) {
    if (!window.confirm(`Remover "${entry.label}" (${money(entry.amount)})?`)) return;
    void run(entry.id, async () => {
      await request(`/api/admin/finance/entries/${entry.id}`, "DELETE");
    });
  }

  function addRow(kind: FinanceKind) {
    const draft = adds[kind] ?? { label: "", amount: "" };
    const amount = parseMoneyInput(draft.amount);
    if (!draft.label.trim()) {
      setError("Informe o nome do lançamento.");
      return;
    }
    if (amount === null) {
      setError("Informe um valor válido, como 90 ou 1.234,56.");
      return;
    }
    void run(`add-${kind}`, async () => {
      await request("/api/admin/finance/entries", "POST", { month, kind, label: draft.label, amount });
      setAdds((current) => ({ ...current, [kind]: { label: "", amount: "" } }));
    });
  }

  function seed(source: "default" | "previous") {
    void run(`seed-${source}`, async () => {
      await request("/api/admin/finance/entries/seed", "POST", { month, source });
    });
  }

  const hasFixed = entries.some((entry) => entry.kind === "FIXA");

  return (
    <div className="grid gap-4">
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      {!hasFixed && (
        <div className="rounded-2xl border border-dashed border-rosa/25 bg-creme/50 p-4">
          <p className="text-sm font-bold text-texto">Este mês ainda não tem despesas fixas</p>
          <p className="mt-1 text-xs text-cinza">
            Sem elas o painel não consegue dizer quanto falta vender para pagar o mês. Comece por uma das opções e ajuste
            os valores depois.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {previousHasFixed && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => seed("previous")}
                className="rounded-xl bg-rosa-profundo px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-40"
              >
                Copiar fixas e retirada do mês anterior
              </button>
            )}
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => seed("default")}
              className={`rounded-xl px-4 py-2.5 text-xs font-extrabold disabled:opacity-40 ${
                previousHasFixed
                  ? "border border-rosa-profundo bg-white text-rosa-profundo"
                  : "bg-rosa-profundo text-white"
              }`}
            >
              Usar as despesas da planilha de precificação
            </button>
          </div>
        </div>
      )}

      {FINANCE_KINDS.map((kind) => {
        const rows = entries.filter((entry) => entry.kind === kind.value);
        const total = rows.reduce((sum, entry) => sum + entry.amount, 0);
        const add = adds[kind.value] ?? { label: "", amount: "" };

        return (
          <section key={kind.value} className="rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-texto">{kind.label}</h3>
                <p className="mt-0.5 text-[11px] text-cinza">{kind.hint}</p>
              </div>
              <p className="shrink-0 text-sm font-extrabold text-texto">{money(total)}</p>
            </div>

            {rows.length > 0 && (
              <ul className="mb-3 grid gap-2">
                {rows.map((entry) => {
                  const draft = drafts[entry.id];
                  const label = draft?.label ?? entry.label;
                  const amount = draft?.amount ?? formatAmount(entry.amount);
                  const dirty = draft !== undefined && (draft.label !== entry.label || draft.amount !== formatAmount(entry.amount));
                  const rowBusy = busy === entry.id;

                  return (
                    <li key={entry.id} className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`label-${entry.id}`}>
                        Nome
                      </label>
                      <input
                        id={`label-${entry.id}`}
                        value={label}
                        maxLength={80}
                        onChange={(event) =>
                          setDrafts((current) => ({ ...current, [entry.id]: { label: event.target.value, amount } }))
                        }
                        className="min-w-0 flex-1 rounded-xl border border-rosa/15 px-3 py-2 text-xs"
                      />
                      <label className="sr-only" htmlFor={`amount-${entry.id}`}>
                        Valor
                      </label>
                      <input
                        id={`amount-${entry.id}`}
                        value={amount}
                        inputMode="decimal"
                        onChange={(event) =>
                          setDrafts((current) => ({ ...current, [entry.id]: { label, amount: event.target.value } }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveRow(entry);
                        }}
                        className="w-24 rounded-xl border border-rosa/15 px-3 py-2 text-right text-xs"
                      />
                      {dirty ? (
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => saveRow(entry)}
                          className="shrink-0 rounded-xl bg-rosa-profundo px-3 py-2 text-[11px] font-extrabold text-white disabled:opacity-40"
                        >
                          {rowBusy ? "…" : "Salvar"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => removeRow(entry)}
                          aria-label={`Remover ${entry.label}`}
                          className="shrink-0 rounded-xl border border-rosa/15 px-3 py-2 text-[11px] font-bold text-cinza hover:text-red-700 disabled:opacity-40"
                        >
                          {rowBusy ? "…" : "Remover"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex items-center gap-2 border-t border-rosa/10 pt-3">
              <input
                value={add.label}
                maxLength={80}
                placeholder="Novo lançamento"
                aria-label={`Nome do novo lançamento em ${kind.label}`}
                onChange={(event) =>
                  setAdds((current) => ({ ...current, [kind.value]: { ...add, label: event.target.value } }))
                }
                className="min-w-0 flex-1 rounded-xl border border-rosa/15 px-3 py-2 text-xs"
              />
              <input
                value={add.amount}
                inputMode="decimal"
                placeholder="0,00"
                aria-label={`Valor do novo lançamento em ${kind.label}`}
                onChange={(event) =>
                  setAdds((current) => ({ ...current, [kind.value]: { ...add, amount: event.target.value } }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") addRow(kind.value);
                }}
                className="w-24 rounded-xl border border-rosa/15 px-3 py-2 text-right text-xs"
              />
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => addRow(kind.value)}
                className="shrink-0 rounded-xl border border-rosa-profundo px-3 py-2 text-[11px] font-extrabold text-rosa-profundo disabled:opacity-40"
              >
                {busy === `add-${kind.value}` ? "…" : "Adicionar"}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
