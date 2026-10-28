"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/money";
import { parseMoneyInput } from "@/lib/finance";

function formatAmount(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function pct(value: number) {
  return `${value.toFixed(0).replace(".", ",")}%`;
}

export function FinanceGoal({
  month,
  isCurrent,
  revenue,
  goal,
  suggestedGoal,
  usesOverride,
  reached,
  progressPct,
  remaining,
  daysLeft,
  perDayNeeded,
  onPace,
  desiredProfit,
  profitInherited,
  marginFromPrevious,
}: {
  month: string;
  isCurrent: boolean;
  revenue: number;
  goal: number | null;
  suggestedGoal: number | null;
  usesOverride: boolean;
  reached: boolean;
  progressPct: number | null;
  remaining: number | null;
  daysLeft: number | null;
  perDayNeeded: number | null;
  onPace: boolean | null;
  desiredProfit: number;
  profitInherited: boolean;
  marginFromPrevious: boolean;
}) {
  const router = useRouter();
  const [profitText, setProfitText] = useState(desiredProfit > 0 ? formatAmount(desiredProfit) : "");
  const [goalText, setGoalText] = useState(usesOverride && goal !== null ? formatAmount(goal) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(clearGoal: boolean) {
    setError("");

    const profit = profitText.trim() === "" ? 0 : parseMoneyInput(profitText);
    if (profit === null) {
      setError("Informe um lucro desejado válido, como 3.000 ou 1.234,56.");
      return;
    }

    let override: number | null = null;
    if (!clearGoal && goalText.trim() !== "") {
      override = parseMoneyInput(goalText);
      if (override === null || override <= 0) {
        setError("Informe uma meta de vendas válida, como 27.500, ou deixe vazio para usar a sugerida.");
        return;
      }
    }

    setBusy(true);
    try {
      const response = await fetch("/api/admin/finance/goal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, desiredProfit: profit, goalOverride: override }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar.");
      if (clearGoal) setGoalText("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  const barWidth = progressPct === null ? 0 : Math.min(100, progressPct);
  const barTone = reached ? "bg-emerald-500" : onPace === false ? "bg-amber-400" : "bg-emerald-400";

  return (
    <section className="mb-4 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-bold text-texto">Meta do mês</h2>

      {goal === null ? (
        <p className="text-xs text-cinza">
          Ainda não dá para sugerir uma meta: faltam vendas com margem positiva (neste mês ou no anterior) para
          calcular quanto é preciso vender. Digite uma meta abaixo ou volte depois das primeiras vendas.
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-2xl font-extrabold text-texto">{money(revenue)}</p>
            <p className="text-xs text-cinza">
              de <span className="font-bold text-texto">{money(goal)}</span>
              {progressPct !== null && <span className="ml-1">({pct(progressPct)})</span>}
            </p>
          </div>

          <div
            className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label={`Meta do mês atingida em ${pct(progressPct ?? 0)}`}
          >
            <div className={`h-full ${barTone}`} style={{ width: `${barWidth}%` }} />
          </div>

          {reached ? (
            <p className="mt-2 text-xs font-semibold text-emerald-800">
              Meta batida. {isCurrent ? "O que vender daqui para frente é lucro extra." : ""}
            </p>
          ) : isCurrent ? (
            <>
              <p className="mt-2 text-xs font-semibold text-texto">
                Faltam {money(remaining ?? 0)}. Para bater a meta, venda{" "}
                <span className="font-extrabold">{money(perDayNeeded ?? 0)}</span> por dia nos {daysLeft}{" "}
                {daysLeft === 1 ? "dia que resta" : "dias que restam"} (contando hoje).
              </p>
              <p className={`mt-1 text-[11px] font-semibold ${onPace === false ? "text-amber-800" : "text-emerald-800"}`}>
                {onPace === false ? "Abaixo do ritmo da meta até aqui." : "No ritmo da meta até aqui."}
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs font-semibold text-texto">Faltaram {money(remaining ?? 0)} para a meta.</p>
          )}

          <p className="mt-2 text-[11px] text-cinza">
            {usesOverride ? (
              <>
                Meta digitada por você
                {suggestedGoal !== null && suggestedGoal > 0 && <> (a sugerida pelo painel é {money(suggestedGoal)})</>}.
              </>
            ) : (
              <>
                Meta sugerida pelo painel: despesas, retirada e lucro desejado ({money(desiredProfit)}
                {profitInherited ? ", repetido do mês anterior" : ""}) divididos pela margem bruta
                {marginFromPrevious ? " do mês anterior, porque este mês ainda não tem vendas" : ""}.
              </>
            )}
          </p>
        </>
      )}

      <details className="mt-3 rounded-xl border border-rosa/15 bg-creme/40 p-3">
        <summary className="cursor-pointer text-xs font-bold text-rosa-profundo">Ajustar meta e lucro desejado</summary>

        <div className="mt-3 grid gap-3">
          <label className="grid gap-1 text-xs font-semibold text-texto">
            Lucro desejado no mês (R$)
            <input
              inputMode="decimal"
              value={profitText}
              onChange={(event) => setProfitText(event.target.value)}
              placeholder="Ex.: 3.000"
              className="rounded-xl border border-rosa/20 bg-white px-3 py-2.5 text-sm font-normal text-texto"
            />
            <span className="text-[10px] font-normal text-cinza">
              Quanto você quer que sobre depois das despesas e da retirada dos sócios.
            </span>
          </label>

          <label className="grid gap-1 text-xs font-semibold text-texto">
            Meta de vendas (R$)
            <input
              inputMode="decimal"
              value={goalText}
              onChange={(event) => setGoalText(event.target.value)}
              placeholder={suggestedGoal !== null && suggestedGoal > 0 ? `Sugerida: ${formatAmount(suggestedGoal)}` : "Deixe vazio para usar a sugerida"}
              className="rounded-xl border border-rosa/20 bg-white px-3 py-2.5 text-sm font-normal text-texto"
            />
            <span className="text-[10px] font-normal text-cinza">
              Deixe vazio para o painel calcular sozinho.
            </span>
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save(false)}
              className="rounded-xl bg-rosa-profundo px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-40"
            >
              {busy ? "Salvando..." : "Salvar"}
            </button>
            {usesOverride && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void save(true)}
                className="rounded-xl border border-rosa-profundo bg-white px-4 py-2.5 text-xs font-extrabold text-rosa-profundo disabled:opacity-40"
              >
                Voltar à sugerida
              </button>
            )}
          </div>
        </div>
      </details>
    </section>
  );
}
