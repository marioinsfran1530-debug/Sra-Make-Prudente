import Link from "next/link";
import { money } from "@/lib/money";
import {
  currentMonth,
  monthLabel,
  monthRange,
  parseMonth,
  saoPauloToday,
  shiftMonth,
  summarizeMonth,
} from "@/lib/finance";
import { countFixedEntries, getMonthSales, listFinanceEntries } from "@/lib/finance-data";
import { FinanceEntries } from "@/components/admin/FinanceEntries";

export const dynamic = "force-dynamic";

function pct(value: number, digits = 0) {
  return `${value.toFixed(digits).replace(".", ",")}%`;
}

function Line({
  label,
  value,
  sign,
  strong,
  note,
}: {
  label: string;
  value: number;
  sign?: "-" | "=";
  strong?: boolean;
  note?: string;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 py-2 ${
        strong ? "border-t border-rosa/15 font-extrabold text-texto" : "text-cinza"
      }`}
    >
      <p className="min-w-0 text-xs">
        {sign && <span className="mr-1.5 inline-block w-3 text-center font-bold">{sign === "-" ? "−" : "="}</span>}
        {label}
        {note && <span className="ml-1 text-[10px] font-normal text-cinza">{note}</span>}
      </p>
      <p className={`shrink-0 text-sm ${strong ? "text-texto" : "font-semibold text-texto"}`}>{money(value)}</p>
    </div>
  );
}

export default async function AdminFinanceiroPage({
  searchParams,
}: {
  searchParams?: Promise<{ mes?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const thisMonth = currentMonth();
  const requested = parseMonth(params?.mes);
  // Não há o que fechar em mês futuro.
  const month = requested > thisMonth ? thisMonth : requested;
  const isCurrent = month === thisMonth;

  const [entries, sales, previousFixedCount] = await Promise.all([
    listFinanceEntries(month),
    getMonthSales(month),
    countFixedEntries(shiftMonth(month, -1)),
  ]);

  const sumOf = (kind: string) =>
    Math.round(entries.filter((entry) => entry.kind === kind).reduce((sum, entry) => sum + entry.amount, 0) * 100) / 100;

  const { days: daysInMonth } = monthRange(month);
  const elapsedDays = isCurrent ? saoPauloToday().day : null;

  const summary = summarizeMonth({
    revenue: sales.revenue,
    cogs: sales.cogs,
    paymentFees: sales.paymentFees,
    fixedExpenses: sumOf("FIXA"),
    variableCosts: sumOf("VARIAVEL"),
    withdrawal: sumOf("RETIRADA"),
    elapsedDays,
    daysInMonth,
  });

  const hasFixed = entries.some((entry) => entry.kind === "FIXA");
  const resultPositive = summary.operatingResult >= 0;
  const coverage = summary.coveragePct === null ? 0 : Math.min(100, summary.coveragePct);

  const per100 = summary.per100;
  const barParts = per100
    ? [
        { key: "Reposição", value: Math.max(0, per100.cogs), tone: "bg-amber-300" },
        { key: "Taxas", value: Math.max(0, per100.fees), tone: "bg-slate-300" },
        { key: "Lucro bruto", value: Math.max(0, per100.grossProfit), tone: "bg-emerald-400" },
      ]
    : [];
  const barTotal = barParts.reduce((sum, part) => sum + part.value, 0);

  const navLink = "rounded-xl border border-rosa/15 bg-white px-3 py-2 text-xs font-bold text-rosa-profundo";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Gestão</p>
        <h1 className="font-serif text-xl font-bold text-texto">Fechamento do mês</h1>
        <p className="mt-1 text-xs text-cinza">
          Quanto entrou, quanto precisa voltar para o estoque e o que sobra de lucro depois das despesas.
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href={`/admin/financeiro?mes=${shiftMonth(month, -1)}`} className={navLink} aria-label="Mês anterior">
          ← {monthLabel(shiftMonth(month, -1)).split(" de ")[0]}
        </Link>
        <p className="text-sm font-extrabold text-texto">{monthLabel(month)}</p>
        {isCurrent ? (
          <span className="rounded-xl border border-transparent px-3 py-2 text-xs font-bold text-transparent" aria-hidden="true">
            →
          </span>
        ) : (
          <Link href={`/admin/financeiro?mes=${shiftMonth(month, 1)}`} className={navLink} aria-label="Próximo mês">
            {monthLabel(shiftMonth(month, 1)).split(" de ")[0]} →
          </Link>
        )}
      </div>

      {sales.realCostSharePct < 80 && sales.revenue > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <span className="font-bold">Valores estimados.</span> Só {pct(sales.realCostSharePct)} dos itens vendidos têm custo
          real cadastrado; no resto vale a regra da loja (custo de 44% do preço). Quanto mais custos reais, mais exato fica o
          lucro.{" "}
          <Link href="/admin/produtos/custos" className="font-bold underline">
            Informar custos reais
          </Link>
        </div>
      )}

      <section
        className={`mb-4 rounded-2xl border p-4 shadow-sm ${
          resultPositive ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
        }`}
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Resultado do mês</p>
        <p className={`mt-1 text-3xl font-extrabold ${resultPositive ? "text-emerald-800" : "text-red-700"}`}>
          {money(summary.operatingResult)}
        </p>
        <p className="mt-1 text-xs text-cinza">
          Depois da retirada dos sócios ({money(sumOf("RETIRADA"))}):{" "}
          <span className="font-bold text-texto">{money(summary.afterWithdrawal)}</span>
        </p>
      </section>

      <section className="mb-4 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-bold text-texto">Para onde vai o dinheiro das vendas</h2>
        <Line label="Vendas finalizadas" note={`(${sales.orders} ${sales.orders === 1 ? "pedido" : "pedidos"})`} value={sales.revenue} />
        <Line label="Reposição do estoque" note="(custo do que vendeu)" value={sales.cogs} sign="-" />
        <Line label="Taxas de pagamento" value={sales.paymentFees} sign="-" />
        <Line
          label="Lucro bruto"
          note={summary.grossMarginPct === null ? undefined : `(margem de ${pct(summary.grossMarginPct, 1)})`}
          value={summary.grossProfit}
          sign="="
          strong
        />
        <Line label="Despesas fixas" value={sumOf("FIXA")} sign="-" />
        <Line label="Custos variáveis" value={sumOf("VARIAVEL")} sign="-" />
        <Line label="Resultado do mês" value={summary.operatingResult} sign="=" strong />
        <Line label="Retirada dos sócios" value={sumOf("RETIRADA")} sign="-" />
        <Line label="Sobra depois da retirada" value={summary.afterWithdrawal} sign="=" strong />

        {per100 && barTotal > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-bold text-texto">De cada R$ 100 vendidos</p>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Divisão de cada R$ 100 vendidos">
              {barParts.map((part) => (
                <div key={part.key} className={part.tone} style={{ width: `${(part.value / barTotal) * 100}%` }} />
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-cinza">
              R$ {per100.cogs.toFixed(0)} voltam ao estoque · R$ {per100.fees.toFixed(0)} em taxas · R${" "}
              {per100.grossProfit.toFixed(0)} de lucro bruto
            </p>
          </div>
        )}
      </section>

      <section className="mb-4 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-bold text-texto">Ponto de equilíbrio</h2>
        {summary.breakEvenRevenue === null ? (
          <p className="text-xs text-cinza">
            Ainda não há vendas com margem positiva neste mês para calcular quanto falta vender.
          </p>
        ) : summary.breakEvenRevenue === 0 ? (
          <p className="text-xs text-cinza">Nenhuma despesa lançada neste mês. Adicione as despesas abaixo.</p>
        ) : (
          <>
            <p className="text-xs text-cinza">
              Para pagar as despesas do mês é preciso vender{" "}
              <span className="font-bold text-texto">{money(summary.breakEvenRevenue)}</span> (com a margem deste mês).
            </p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Despesas cobertas em ${pct(coverage)}`}>
              <div
                className={`h-full ${summary.remainingToBreakEven === 0 ? "bg-emerald-500" : "bg-amber-400"}`}
                style={{ width: `${coverage}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-texto">
              {summary.remainingToBreakEven === 0
                ? "Despesas do mês cobertas. O que vender daqui para frente entra como lucro."
                : `Faltam ${money(summary.remainingToBreakEven ?? 0)} de vendas para cobrir as despesas.`}
            </p>
            {sumOf("RETIRADA") > 0 && summary.breakEvenWithWithdrawal !== null && (
              <p className="mt-1 text-[11px] text-cinza">
                Para cobrir também a retirada: {money(summary.breakEvenWithWithdrawal)} em vendas
                {summary.breakEvenWithWithdrawal > sales.revenue
                  ? ` (faltam ${money(summary.breakEvenWithWithdrawal - sales.revenue)}).`
                  : " (já alcançado)."}
              </p>
            )}
          </>
        )}
      </section>

      {isCurrent && summary.projectedRevenue !== null && (
        <section className="mb-4 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-bold text-texto">Se o ritmo continuar</h2>
          <p className="text-xs text-cinza">
            Com {elapsedDays} {elapsedDays === 1 ? "dia" : "dias"} de vendas, o mês fecha perto de{" "}
            <span className="font-bold text-texto">{money(summary.projectedRevenue)}</span> em vendas e resultado de{" "}
            <span className="font-bold text-texto">{money(summary.projectedOperatingResult ?? 0)}</span>.
          </p>
          {(elapsedDays ?? 0) < 7 && (
            <p className="mt-1 text-[11px] text-amber-800">Poucos dias de dados: a projeção ainda é pouco confiável.</p>
          )}
        </section>
      )}

      <h2 className="mb-2 mt-6 text-sm font-bold text-texto">Despesas de {monthLabel(month)}</h2>
      <FinanceEntries month={month} entries={entries} previousHasFixed={previousFixedCount > 0} />

      {!hasFixed && sales.revenue > 0 && (
        <p className="mt-3 text-[11px] text-cinza">
          O resultado acima ainda não desconta despesas fixas, porque nenhuma foi lançada neste mês.
        </p>
      )}

      <p className="mt-6 text-[10px] leading-4 text-cinza">
        Como é calculado: vendas = total dos pedidos finalizados no mês (horário de Brasília, incluindo frete cobrado).
        Reposição = custo gravado na venda; sem ele, o custo atual do produto; sem ele, 44% do preço. Taxas = o que foi
        registrado nas vendas de cartão e link (Pix e dinheiro não têm taxa). Equilíbrio = despesas ÷ margem bruta do mês.
        Anúncios, embalagens e fretes pagos por vocês entram em custos variáveis.
      </p>
    </div>
  );
}
