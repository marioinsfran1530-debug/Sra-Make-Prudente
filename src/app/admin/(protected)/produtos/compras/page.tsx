import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { ESTIMATED_COST_RATIO } from "@/lib/pricing";
import {
  HORIZON_OPTIONS,
  SALES_WINDOW_DAYS,
  SUPPLY_ORIGINS,
  parseHorizon,
  parseSupplyOrigin,
  suggestPurchase,
  unitCostOf,
  windowStart,
} from "@/lib/purchasing";
import { CopyListButton } from "@/components/admin/CopyListButton";

export const dynamic = "force-dynamic";

function days(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export default async function AdminComprasPage({
  searchParams,
}: {
  searchParams?: Promise<{ origem?: string; dias?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const origin = parseSupplyOrigin(params?.origem);
  const horizon = parseHorizon(params?.dias);

  const since = windowStart(SALES_WINDOW_DAYS);

  const [products, sales] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        brand: true,
        price: true,
        costPrice: true,
        stockQty: true,
        variants: { where: { active: true }, select: { stockQty: true } },
      },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { status: "FINALIZADO", updatedAt: { gte: since } } },
      _sum: { qty: true, subtotal: true },
    }),
  ]);

  const productById = new Map(products.map((product) => [product.id, product]));

  // Fechamento do período: o que entrou, quanto precisa voltar para o estoque
  // (custo do que foi vendido) e o que sobra como lucro bruto.
  let revenue = 0;
  let replenishment = 0;
  let revenueWithRealCost = 0;
  for (const row of sales) {
    const units = row._sum.qty ?? 0;
    const subtotal = Number(row._sum.subtotal ?? 0);
    revenue += subtotal;
    const product = productById.get(row.productId);
    if (product && product.costPrice !== null) {
      replenishment += units * Number(product.costPrice);
      revenueWithRealCost += subtotal;
    } else if (product) {
      replenishment += units * unitCostOf(Number(product.price), null).unitCost;
    } else {
      // Produto que saiu do catálogo: sem custo cadastrado, usa a regra da loja.
      replenishment += subtotal * ESTIMATED_COST_RATIO;
    }
  }
  const grossProfit = revenue - replenishment;
  const realCostShare = revenue > 0 ? (revenueWithRealCost / revenue) * 100 : 0;

  const unitsByProduct = new Map(sales.map((row) => [row.productId, row._sum.qty ?? 0]));

  const suggestions = products
    .map((product) => {
      const unitsSold = unitsByProduct.get(product.id) ?? 0;
      const stockQty = product.variants.length
        ? product.variants.reduce((sum, variant) => sum + variant.stockQty, 0)
        : product.stockQty;
      const suggestion = suggestPurchase(
        {
          stockQty,
          unitsSold,
          price: Number(product.price),
          costPrice: product.costPrice === null ? null : Number(product.costPrice),
        },
        { horizonDays: horizon, leadDays: origin.leadDays }
      );
      return { product, unitsSold, stockQty, suggestion };
    })
    .filter((item) => item.unitsSold > 0 && item.suggestion.suggestedQty > 0)
    .sort(
      (a, b) =>
        Number(b.suggestion.urgent) - Number(a.suggestion.urgent) ||
        (a.suggestion.coverageDays ?? Infinity) - (b.suggestion.coverageDays ?? Infinity) ||
        b.suggestion.lineTotal - a.suggestion.lineTotal
    );

  const urgentCount = suggestions.filter((item) => item.suggestion.urgent).length;
  const totalPurchase = suggestions.reduce((sum, item) => sum + item.suggestion.lineTotal, 0);
  const estimatedCount = suggestions.filter((item) => item.suggestion.costIsEstimated).length;

  const copyText = [
    `Lista de compras — ${origin.label}, para ${horizon} dias`,
    ...suggestions.map((item) => `${item.product.name} — ${item.suggestion.suggestedQty} un.`),
  ].join("\n");

  const href = (nextOrigin: string, nextHorizon: number) =>
    `/admin/produtos/compras?origem=${nextOrigin}&dias=${nextHorizon}`;

  const chip = (active: boolean) =>
    `rounded-xl border px-3 py-2 text-xs font-bold ${
      active ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-rosa/15 bg-white text-cinza"
    }`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Margem e compras</p>
        <h1 className="font-serif text-xl font-bold text-texto">Compras: o que repor</h1>
        <p className="mt-1 text-xs text-cinza">
          Calculado pelo ritmo de venda dos últimos {SALES_WINDOW_DAYS} dias. A quantidade sugerida cobre os dias até a
          mercadoria chegar mais o período escolhido.
        </p>
      </div>

      <section className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl bg-white p-3 shadow-sm sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Vendas ({SALES_WINDOW_DAYS} dias)</p>
          <p className="mt-1 text-base font-extrabold text-texto sm:text-xl">{money(revenue)}</p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Voltar ao estoque</p>
          <p className="mt-1 text-base font-extrabold text-texto sm:text-xl">{money(replenishment)}</p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Lucro bruto</p>
          <p className="mt-1 text-base font-extrabold text-emerald-800 sm:text-xl">{money(grossProfit)}</p>
        </div>
      </section>
      <p className="mb-5 text-[10px] leading-4 text-cinza">
        Estimativa: só {realCostShare.toFixed(0).replace(".", ",")}% das vendas têm custo real cadastrado; no restante vale a
        regra da loja (custo de 44% do preço). Antes de gastar o lucro, separe o valor que precisa voltar ao estoque.{" "}
        <Link href="/admin/produtos/custos" className="font-bold text-rosa-profundo underline">
          Informar custos reais
        </Link>
      </p>

      <div className="mb-3">
        <p className="mb-2 text-[11px] font-bold text-texto">Onde vai comprar</p>
        <div className="flex flex-wrap gap-2">
          {SUPPLY_ORIGINS.map((item) => (
            <Link key={item.value} href={href(item.value, horizon)} className={chip(item.value === origin.value)}>
              {item.label} · {item.leadDays} {item.leadDays === 1 ? "dia" : "dias"}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-[11px] font-bold text-texto">Comprar para quantos dias</p>
        <div className="flex flex-wrap gap-2">
          {HORIZON_OPTIONS.map((option) => (
            <Link key={option} href={href(origin.value, option)} className={chip(option === horizon)}>
              {option} dias
            </Link>
          ))}
        </div>
      </div>

      <section className="mb-4 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Compra sugerida</p>
            <p className="mt-1 text-2xl font-extrabold text-texto">{money(totalPurchase)}</p>
            <p className="mt-1 text-[11px] text-cinza">
              {suggestions.length} {suggestions.length === 1 ? "produto" : "produtos"}
              {urgentCount > 0 ? ` · ${urgentCount} acabam antes de chegar` : ""}
              {estimatedCount > 0 ? ` · ${estimatedCount} com custo estimado` : ""}
            </p>
          </div>
          <CopyListButton text={copyText} disabled={suggestions.length === 0} />
        </div>
      </section>

      {suggestions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rosa/20 bg-creme/40 p-5 text-sm text-cinza">
          Nenhum produto que vendeu nos últimos {SALES_WINDOW_DAYS} dias precisa de reposição para esse período.
        </div>
      ) : (
        <ul className="grid gap-2">
          {suggestions.map(({ product, stockQty, suggestion }) => (
            <li key={product.id} className="rounded-2xl border border-rosa/10 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/produtos/${product.id}`}
                    className="block text-sm font-bold text-texto hover:text-rosa-profundo hover:underline"
                  >
                    {product.name}
                  </Link>
                  <p className="mt-0.5 text-[10px] text-cinza">
                    {product.brand} · estoque {stockQty} · vende {days(suggestion.dailySales * 7)} por semana
                    {suggestion.coverageDays !== null ? ` · dura ${days(suggestion.coverageDays)} dias` : ""}
                  </p>
                </div>
                {suggestion.urgent && (
                  <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-[9px] font-bold text-red-700">
                    acaba antes de chegar
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-xs text-cinza">
                  Comprar <span className="text-base font-extrabold text-texto">{suggestion.suggestedQty}</span> un. ·{" "}
                  {money(suggestion.unitCost)} cada{suggestion.costIsEstimated ? " (estimado)" : ""}
                </p>
                <p className="text-sm font-extrabold text-texto">{money(suggestion.lineTotal)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[10px] leading-4 text-cinza">
        Como o cálculo funciona: ritmo diário = unidades vendidas em {SALES_WINDOW_DAYS} dias ÷ {SALES_WINDOW_DAYS}. Quantidade =
        ritmo × ({origin.leadDays} dia{origin.leadDays === 1 ? "" : "s"} de chegada + {horizon} dias) − estoque atual. Só entram
        produtos com venda no período; o que está parado aparece em Estoque parado. Com poucas vendas por produto, use como
        guia e ajuste pelo seu conhecimento (datas fortes, lançamentos).
      </p>
    </div>
  );
}
