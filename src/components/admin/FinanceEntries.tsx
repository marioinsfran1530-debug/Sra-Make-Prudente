"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/money";
import {
  FINANCE_KINDS,
  parseMoneyInput,
  paymentState,
  type FinanceEntryRow,
  type FinanceKind,
  type FinanceStatus,
  type PaymentTone,
} from "@/lib/finance";

// "date" é a data que importa para a situação da linha: pago em (PAGO) ou vencimento (PENDENTE).
type Draft = { label: string; amount: string; date: string };
type AddDraft = { label: string; amount: string; status: FinanceStatus; date: string };

const EMPTY_ADD: AddDraft = { label: "", amount: "", status: "PAGO", date: "" };

const TONE_CLASS: Record<PaymentTone, string> = {
  paid: "bg-emerald-50 text-emerald-800",
  pending: "bg-amber-50 text-amber-800",
  "due-today": "bg-amber-100 text-amber-900",
  overdue: "bg-red-50 text-red-700",
};

function formatAmount(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function entryDate(entry: FinanceEntryRow) {
  return (entry.status === "PAGO" ? entry.paidAt : entry.dueDate) ?? "";
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
  today,
}: {
  month: string;
  entries: FinanceEntryRow[];
  previousHasFixed: boolean;
  today: string;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [adds, setAdds] = useState<Record<string, AddDraft>>({});
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

  function patchDraft(entry: FinanceEntryRow, patch: Partial<Draft>) {
    setDrafts((current) => {
      const base = current[entry.id] ?? {
        label: entry.label,
        amount: formatAmount(entry.amount),
        date: entryDate(entry),
      };
      return { ...current, [entry.id]: { ...base, ...patch } };
    });
  }

  function patchAdd(kind: FinanceKind, patch: Partial<AddDraft>) {
    setAdds((current) => ({ ...current, [kind]: { ...(current[kind] ?? EMPTY_ADD), ...patch } }));
  }

  function saveRow(entry: FinanceEntryRow) {
    const draft = drafts[entry.id];
    if (!draft) return;
    const amount = parseMoneyInput(draft.amount);
    if (amount === null) {
      setError("Informe um valor válido, como 90 ou 1.234,56.");
      return;
    }
    // Data vazia: pago sem data informada, ou conta a pagar sem vencimento.
    const date = draft.date === "" ? null : draft.date;
    const payment =
      entry.status === "PAGO"
        ? { status: "PAGO", dueDate: entry.dueDate, paidAt: date }
        : { status: "PENDENTE", dueDate: date };
    void run(entry.id, async () => {
      await request(`/api/admin/finance/entries/${entry.id}`, "PATCH", { label: draft.label, amount, ...payment });
      setDrafts((current) => {
        const next = { ...current };
        delete next[entry.id];
        return next;
      });
    });
  }

  // Marcar como pago não envia a data: o servidor usa o dia de hoje (horário de Brasília).
  function setPaymentStatus(entry: FinanceEntryRow, status: FinanceStatus) {
    void run(`pay-${entry.id}`, async () => {
      await request(`/api/admin/finance/entries/${entry.id}`, "PATCH", {
        label: entry.label,
        amount: entry.amount,
        status,
        dueDate: entry.dueDate,
      });
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
    const draft = adds[kind] ?? EMPTY_ADD;
    const amount = parseMoneyInput(draft.amount);
    if (!draft.label.trim()) {
      setError("Informe o nome do lançamento.");
      return;
    }
    if (amount === null) {
      setError("Informe um valor válido, como 90 ou 1.234,56.");
      return;
    }
    // Pago sem data (campo omitido) = pago hoje; a pagar sem data = sem vencimento.
    const payment =
      draft.status === "PAGO"
        ? { status: "PAGO", ...(draft.date ? { paidAt: draft.date } : {}) }
        : { status: "PENDENTE", dueDate: draft.date || null };
    void run(`add-${kind}`, async () => {
      await request("/api/admin/finance/entries", "POST", { month, kind, label: draft.label, amount, ...payment });
      setAdds((current) => ({ ...current, [kind]: { ...EMPTY_ADD, status: draft.status } }));
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
            os valores depois. As despesas carregadas entram como &quot;a pagar&quot;.
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
        const add = adds[kind.value] ?? EMPTY_ADD;

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
              <ul className="mb-3 grid gap-3">
                {rows.map((entry) => {
                  const draft = drafts[entry.id];
                  const label = draft?.label ?? entry.label;
                  const amount = draft?.amount ?? formatAmount(entry.amount);
                  const date = draft?.date ?? entryDate(entry);
                  const dirty =
                    draft !== undefined &&
                    (draft.label !== entry.label ||
                      draft.amount !== formatAmount(entry.amount) ||
                      draft.date !== entryDate(entry));
                  const rowBusy = busy === entry.id;
                  const payBusy = busy === `pay-${entry.id}`;
                  const state = paymentState(entry, today);
                  const isPaid = entry.status === "PAGO";

                  return (
                    <li key={entry.id} className="grid gap-1.5">
                      <div className="flex items-center gap-2">
                        <label className="sr-only" htmlFor={`label-${entry.id}`}>
                          Nome
                        </label>
                        <input
                          id={`label-${entry.id}`}
                          value={label}
                          maxLength={80}
                          onChange={(event) => patchDraft(entry, { label: event.target.value })}
                          className="min-w-0 flex-1 rounded-xl border border-rosa/15 px-3 py-2 text-xs"
                        />
                        <label className="sr-only" htmlFor={`amount-${entry.id}`}>
                          Valor
                        </label>
                        <input
                          id={`amount-${entry.id}`}
                          value={amount}
                          inputMode="decimal"
                          onChange={(event) => patchDraft(entry, { amount: event.target.value })}
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
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pl-1">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE_CLASS[state.tone]}`}>
                          {state.label}
                        </span>
                        <label htmlFor={`date-${entry.id}`} className="text-[10px] text-cinza">
                          {isPaid ? "Pago em" : "Vence em"}
                        </label>
                        <input
                          id={`date-${entry.id}`}
                          type="date"
                          value={date}
                          max={isPaid ? today : undefined}
                          onChange={(event) => patchDraft(entry, { date: event.target.value })}
                          className="rounded-lg border border-rosa/15 px-2 py-1 text-[11px]"
                        />
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => setPaymentStatus(entry, isPaid ? "PENDENTE" : "PAGO")}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold disabled:opacity-40 ${
                            isPaid
                              ? "border border-rosa/15 text-cinza"
                              : "border border-emerald-600 bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {payBusy ? "…" : isPaid ? "Voltar para a pagar" : "Marcar como pago"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="border-t border-rosa/10 pt-3">
              <div className="flex items-center gap-2">
                <input
                  value={add.label}
                  maxLength={80}
                  placeholder="Novo lançamento"
                  aria-label={`Nome do novo lançamento em ${kind.label}`}
                  onChange={(event) => patchAdd(kind.value, { label: event.target.value })}
                  className="min-w-0 flex-1 rounded-xl border border-rosa/15 px-3 py-2 text-xs"
                />
                <input
                  value={add.amount}
                  inputMode="decimal"
                  placeholder="0,00"
                  aria-label={`Valor do novo lançamento em ${kind.label}`}
                  onChange={(event) => patchAdd(kind.value, { amount: event.target.value })}
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

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div
                  role="group"
                  aria-label={`Situação do novo lançamento em ${kind.label}`}
                  className="flex overflow-hidden rounded-xl border border-rosa/15 text-[11px] font-bold"
                >
                  {(
                    [
                      { value: "PAGO", label: "Pago" },
                      { value: "PENDENTE", label: "A pagar" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={add.status === option.value}
                      onClick={() => patchAdd(kind.value, { status: option.value, date: "" })}
                      className={`px-3 py-1.5 ${
                        add.status === option.value ? "bg-rosa-profundo text-white" : "bg-white text-cinza"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <label htmlFor={`add-date-${kind.value}`} className="text-[10px] text-cinza">
                  {add.status === "PAGO" ? "Pago em" : "Vence em"}
                </label>
                <input
                  id={`add-date-${kind.value}`}
                  type="date"
                  value={add.date}
                  max={add.status === "PAGO" ? today : undefined}
                  onChange={(event) => patchAdd(kind.value, { date: event.target.value })}
                  className="rounded-lg border border-rosa/15 px-2 py-1 text-[11px]"
                />
                <span className="text-[10px] text-cinza">
                  {add.status === "PAGO" ? "Em branco = hoje" : "Opcional"}
                </span>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
