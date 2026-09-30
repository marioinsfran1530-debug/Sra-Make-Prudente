import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Period = "7d" | "30d" | "month" | "all";
type Metric = "revenue" | "quantity";

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Este mês" },
  { value: "all", label: "Todo período" },
];

const METRICS: { value: Metric; label: string }[] = [
  { value: "revenue", label: "Por faturamento" },
  { value: "quantity", label: "Por quantidade" },
];

function getSaoPauloDateParts() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function saoPauloMidnightUtc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
}

function getPeriodRange(period: Period) {
  if (period === "all") return undefined;

  const { year, month, day } = getSaoPauloDateParts();
  const today = saoPauloMidnightUtc(year, month, day);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  if (period === "month") {
    return { gte: saoPauloMidnightUtc(year, month, 1), lt: tomorrow };
  }

  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (period === "7d" ? 6 : 29));
  return { gte: start, lt: tomorrow };
}

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function number(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function pct(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + "%";
}

type ProductSales = {
  productId: string;
  name: string;
  brand: string;
  units: number;
  revenue: number;
  orders: number;
  stockQty: number;
};

type AbcRow = ProductSales & {
  rank: number;
  baseValue: number;
  share: number;
  cumulative: number;
  curve: "A" | "B" | "C";
};

function classForCumulative(previousCumulative: number): AbcRow["curve"] {
  if (previousCumulative < 80) return "A";
  if (previousCumulative < 95) return "B";
  return "C";
}

function curveTone(curve: AbcRow["curve"]) {
  if (curve === "A") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (curve === "B") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default async function CurvaAbcPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string; metric?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;

  const requestedPeriod = params?.period;
  const period: Period = PERIODS.some((item) => item.value === requestedPeriod)
    ? (requestedPeriod as Period)
    : "30d";

  const requestedMetric = params?.metric;
  const metric: Metric = requestedMetric === "quantity" ? "quantity" : "revenue";
  const range = getPeriodRange(period);

  const [orders, products] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: "FINALIZADO",
        ...(range ? { updatedAt: range } : {}),
      },
      select: {
        id: true,
        items: {
          select: {
            productId: true,
            qty: true,
            subtotal: true,
          },
        },
      },
    }),
    prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        brand: true,
        stockQty: true,
        variants: {
          where: { active: true },
          select: { stockQty: true },
        },
      },
    }),
  ]);

  const salesMap = new Map<string, { units: number; revenue: number; orders: number }>();

  for (const order of orders) {
    const productIdsInOrder = new Set<string>();

    for (const item of order.items) {
      const current = salesMap.get(item.productId) ?? {
        units: 0,
        revenue: 0,
        orders: 0,
      };

      current.units += item.qty;
      current.revenue += Number(item.subtotal);
      productIdsInOrder.add(item.productId);
      salesMap.set(item.productId, current);
    }

    for (const productId of productIdsInOrder) {
      const current = salesMap.get(productId);
      if (current) current.orders += 1;
    }
  }

  const productMap = new Map(
    products.map((product) => {
      const stockQty =
        product.variants.length > 0
          ? product.variants.reduce((sum, variant) => sum + variant.stockQty, 0)
          : product.stockQty;

      return [
        product.id,
        {
          id: product.id,
          name: product.name,
          brand: product.brand,
          stockQty,
        },
      ] as const;
    })
  );

  const soldProducts: ProductSales[] = Array.from(salesMap.entries())
    .map(([productId, sales]) => {
      const product = productMap.get(productId);
      return {
        productId,
        name: product?.name ?? "Produto não identificado",
        brand: product?.brand ?? "Sem marca",
        stockQty: product?.stockQty ?? 0,
        ...sales,
      };
    })
    .filter((product) => product.units > 0 || product.revenue > 0);

  soldProducts.sort((a, b) => {
    const aValue = metric === "revenue" ? a.revenue : a.units;
    const bValue = metric === "revenue" ? b.revenue : b.units;
    return bValue - aValue || b.units - a.units || a.name.localeCompare(a.name, "pt-BR");
  });

  const totalRevenue = soldProducts.reduce((sum, product) => sum + product.revenue, 0);
  const totalUnits = soldProducts.reduce((sum, product) => sum + product.units, 0);
  const baseTotal = metric === "revenue" ? totalRevenue : totalUnits;

  let cumulative = 0;
  const abcRows: AbcRow[] = soldProducts.map((product, index) => {
    const baseValue = metric === "revenue" ? product.revenue : product.units;
    const share = baseTotal > 0 ? (baseValue / baseTotal) * 100 : 0;
    const previousCumulative = cumulative;
    cumulative += share;

    return {
      ...product,
      rank: index + 1,
      baseValue,
      share,
      cumulative,
      curve: classForCumulative(previousCumulative),
    };
  });

  const curveSummary = (["A", "B", "C"] as const).map((curve) => {
    const rows = abcRows.filter((row) => row.curve === curve);
    const baseValue = rows.reduce((sum, row) => sum + row.baseValue, 0);
    return {
      curve,
      items: rows.length,
      baseValue,
      share: baseTotal > 0 ? (baseValue / baseTotal) * 100 : 0,
    };
  });

  const unsoldCount = Math.max(products.length - soldProducts.length, 0);
  const topSold = abcRows.slice(0, 10);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">
            Inteligência de estoque
          </p>
          <h1 className="font-serif text-2xl font-bold text-texto">Curva ABC de vendas</h1>
          <p className="mt-1 max-w-3xl text-sm text-cinza">
            Descubra quais produtos concentram as vendas e use a classificação A, B e C para priorizar compra, estoque e exposição.
          </p>
        </div>

        <Link
          href="/admin/analise"
          className="rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-center text-xs font-bold text-rosa-profundo"
        >
          Voltar para análise
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {PERIODS.map((item) => {
          const active = item.value === period;
          const paramsString = new URLSearchParams({
            period: item.value,
            metric,
          }).toString();

          return (
            <Link
              key={item.value}
              href={`/admin/analise/abc?${paramsString}`}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                active
                  ? "border-rosa-profundo bg-rosa-profundo text-white"
                  : "border-rosa/15 bg-white text-cinza"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {METRICS.map((item) => {
          const active = item.value === metric;
          const paramsString = new URLSearchParams({
            period,
            metric: item.value,
          }).toString();

          return (
            <Link
              key={item.value}
              href={`/admin/analise/abc?${paramsString}`}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                active
                  ? "border-rosa-profundo bg-rosa-profundo text-white"
                  : "border-rosa/15 bg-white text-cinza"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryMetric
          label="Faturamento"
          value={money(totalRevenue)}
          helper="vendas finalizadas"
        />
        <SummaryMetric
          label="Itens vendidos"
          value={number(totalUnits)}
          helper={`${soldProducts.length} produtos vendidos`}
        />
        <SummaryMetric
          label="Pedidos"
          value={number(orders.length)}
          helper="com status finalizado"
        />
        <SummaryMetric
          label="Sem venda no período"
          value={number(unsoldCount)}
          helper="produtos ativos"
        />
      </section>

      <section className="mb-5 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="font-bold text-texto">Distribuição da curva</h2>
          <p className="mt-1 text-xs leading-5 text-cinza">
            A classificação usa a métrica selecionada e acumula a participação dos produtos do maior para o menor.
            As faixas são aproximadas: A até 80%, B de 80% a 95% e C no restante.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {curveSummary.map((item) => (
            <div
              key={item.curve}
              className={`rounded-2xl border p-4 ${curveTone(item.curve)}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-2xl font-extrabold">{item.curve}</span>
                <span className="text-xs font-bold">{pct(item.share)} da base</span>
              </div>
              <p className="mt-2 text-sm font-extrabold">
                {number(item.items)} produto{item.items === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-xs">
                {metric === "revenue"
                  ? money(item.baseValue)
                  : `${number(item.baseValue)} unidades`}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-bold text-texto">Produtos mais vendidos</h2>
            <p className="mt-1 text-xs text-cinza">
              Ordenado por {metric === "revenue" ? "faturamento" : "quantidade vendida"} no período.
            </p>
          </div>
          <span className="text-[10px] font-bold text-cinza">
            Mostrando os {Math.min(10, topSold.length)} primeiros
          </span>
        </div>

        {topSold.length === 0 ? (
          <div className="rounded-xl border border-dashed border-rosa/20 bg-creme/40 p-5 text-sm text-cinza">
            Nenhuma venda finalizada foi registrada no período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-rosa/10 text-[10px] uppercase tracking-wide text-cinza">
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">Produto</th>
                  <th className="px-3 py-3">Curva</th>
                  <th className="px-3 py-3 text-right">Unidades</th>
                  <th className="px-3 py-3 text-right">Faturamento</th>
                  <th className="px-3 py-3 text-right">Participação</th>
                  <th className="px-3 py-3 text-right">Acumulado</th>
                  <th className="px-3 py-3 text-right">Estoque</th>
                </tr>
              </thead>
              <tbody>
                {topSold.map((row) => (
                  <tr key={row.productId} className="border-b border-rosa/10 last:border-b-0">
                    <td className="px-3 py-3 text-sm font-extrabold text-rosa-profundo">
                      {row.rank}
                    </td>
                    <td className="max-w-[300px] px-3 py-3">
                      <Link
                        href={`/admin/produtos/${row.productId}`}
                        className="font-bold text-texto hover:text-rosa-profundo hover:underline"
                      >
                        {row.name}
                      </Link>
                      <p className="mt-0.5 text-[10px] text-cinza">{row.brand}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${curveTone(row.curve)}`}
                      >
                        {row.curve}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-texto">
                      {number(row.units)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-texto">
                      {money(row.revenue)}
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-semibold text-texto">
                      {pct(row.share)}
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-semibold text-texto">
                      {pct(row.cumulative)}
                    </td>
                    <td className={`px-3 py-3 text-right text-xs font-bold ${row.stockQty > 0 ? "text-texto" : "text-red-700"}`}>
                      {number(row.stockQty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-3">
        <ActionCard
          title="Curva A"
          detail="Produtos que concentram até aproximadamente 80% da base. Merecem acompanhamento mais frequente de estoque e reposição."
        />
        <ActionCard
          title="Curva B"
          detail="Produtos intermediários, entre aproximadamente 80% e 95%. Acompanhe giro e oportunidade de exposição."
        />
        <ActionCard
          title="Curva C"
          detail="Produtos de menor participação no período. Avalie espaço, sortimento, compra e eventual encalhe com o contexto do negócio."
        />
      </section>

      <p className="text-[10px] leading-4 text-cinza">
        A curva é calculada por produto usando apenas pedidos FINALIZADOS. Cancelamentos não entram na base.
        Produtos sem venda no período ficam fora da curva e aparecem no indicador “Sem venda no período”.
      </p>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-texto">{value}</p>
      <p className="mt-1 text-[10px] text-cinza">{helper}</p>
    </div>
  );
}

function ActionCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-rosa/10 bg-creme/50 p-4">
      <p className="text-lg font-extrabold text-rosa-profundo">{title}</p>
      <p className="mt-2 text-xs leading-5 text-cinza">{detail}</p>
    </div>
  );
}
