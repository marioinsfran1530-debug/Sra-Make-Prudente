import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Period = "7d" | "30d" | "month" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Este mês" },
  { value: "all", label: "Todo período" },
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
  if (period === "month") return { gte: saoPauloMidnightUtc(year, month, 1), lt: tomorrow };
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (period === "7d" ? 6 : 29));
  return { gte: start, lt: tomorrow };
}

function pct(part: number, total: number) {
  const value = total > 0 ? (part / total) * 100 : 0;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type ProductRow = {
  id: string;
  name: string;
  brand: string;
  active: boolean;
  stockQty: number;
  views: number;
  carts: number;
  finalizedOrders: number;
  unitsSold: number;
  revenue: number;
};

function signal(row: ProductRow) {
  if (row.finalizedOrders > 0) return { label: "Converte", tone: "text-green-700 bg-green-50 border-green-200" };
  if (row.carts > 0) return { label: "Intenção sem venda", tone: "text-amber-700 bg-amber-50 border-amber-200" };
  if (row.views >= 5) return { label: "Visto, sem carrinho", tone: "text-red-700 bg-red-50 border-red-200" };
  return { label: "Coletando dados", tone: "text-cinza bg-creme border-rosa/10" };
}

export default async function ProductPerformancePage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const requested = params?.period;
  const period: Period = PERIODS.some((item) => item.value === requested)
    ? (requested as Period)
    : "7d";
  const range = getPeriodRange(period);
  const analyticsWhere = range ? { createdAt: range } : {};
  const finalizedWhere = range ? { updatedAt: range } : {};

  const [behaviorGroups, finalizedOrders] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["productId", "event"],
      where: {
        ...analyticsWhere,
        productId: { not: null },
        event: { in: ["product_view", "add_to_cart"] },
      },
      _count: { _all: true },
    }),
    prisma.order.findMany({
      where: {
        ...finalizedWhere,
        status: "FINALIZADO",
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
  ]);

  const stats = new Map<string, Omit<ProductRow, "id" | "name" | "brand" | "active" | "stockQty">>();

  function ensure(productId: string) {
    const current = stats.get(productId);
    if (current) return current;
    const fresh = { views: 0, carts: 0, finalizedOrders: 0, unitsSold: 0, revenue: 0 };
    stats.set(productId, fresh);
    return fresh;
  }

  for (const item of behaviorGroups) {
    if (!item.productId) continue;
    const current = ensure(item.productId);
    if (item.event === "product_view") current.views = item._count._all;
    if (item.event === "add_to_cart") current.carts = item._count._all;
  }

  for (const order of finalizedOrders) {
    const productsInOrder = new Set<string>();
    for (const item of order.items) {
      const current = ensure(item.productId);
      current.unitsSold += item.qty;
      current.revenue += Number(item.subtotal);
      productsInOrder.add(item.productId);
    }
    for (const productId of productsInOrder) {
      ensure(productId).finalizedOrders += 1;
    }
  }

  const ids = Array.from(stats.keys());
  const products = ids.length
    ? await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, brand: true, active: true, stockQty: true },
      })
    : [];

  const rows: ProductRow[] = products
    .map((product) => ({ ...product, ...(stats.get(product.id) ?? { views: 0, carts: 0, finalizedOrders: 0, unitsSold: 0, revenue: 0 }) }))
    .sort((a, b) => b.views - a.views || b.carts - a.carts || b.revenue - a.revenue);

  const totalViews = rows.reduce((sum, item) => sum + item.views, 0);
  const totalCarts = rows.reduce((sum, item) => sum + item.carts, 0);
  const totalUnits = rows.reduce((sum, item) => sum + item.unitsSold, 0);
  const totalRevenue = rows.reduce((sum, item) => sum + item.revenue, 0);
  const opportunityCount = rows.filter((item) => item.views >= 5 && item.finalizedOrders === 0).length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Inteligência comercial</p>
          <h1 className="font-serif text-2xl font-bold text-texto">Desempenho dos produtos</h1>
          <p className="mt-1 max-w-3xl text-sm text-cinza">
            Cruza comportamento do catálogo com vendas realmente finalizadas para mostrar quais produtos atraem atenção, geram intenção e convertem.
          </p>
        </div>
        <Link href="/admin/analise" className="rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo">
          Voltar para Análise
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {PERIODS.map((item) => {
          const active = item.value === period;
          return (
            <Link
              key={item.value}
              href={item.value === "7d" ? "/admin/analise/produtos" : `/admin/analise/produtos?period=${item.value}`}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${active ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-rosa/15 bg-white text-cinza"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="Visualizações" value={totalViews} />
        <Metric label="Carrinhos" value={totalCarts} />
        <Metric label="Unidades vendidas" value={totalUnits} />
        <Metric label="Receita finalizada" value={money(totalRevenue)} />
        <Metric label="Oportunidades" value={opportunityCount} />
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-rosa/10 px-5 py-4">
          <h2 className="font-bold text-texto">Produto por produto</h2>
          <p className="mt-1 text-[11px] text-cinza">
            Carrinho / visualização mede intenção. Venda só considera pedidos com status FINALIZADO.
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="p-6 text-sm text-cinza">Ainda não há dados suficientes neste período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-left text-xs">
              <thead className="bg-creme/70 text-[10px] uppercase tracking-wide text-cinza">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-3 py-3 text-right">Vistas</th>
                  <th className="px-3 py-3 text-right">Carrinhos</th>
                  <th className="px-3 py-3 text-right">Intenção</th>
                  <th className="px-3 py-3 text-right">Pedidos finais</th>
                  <th className="px-3 py-3 text-right">Unidades</th>
                  <th className="px-3 py-3 text-right">Receita</th>
                  <th className="px-4 py-3">Sinal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rosa/10">
                {rows.map((row) => {
                  const status = signal(row);
                  return (
                    <tr key={row.id} className="align-middle">
                      <td className="px-4 py-3">
                        <p className="max-w-[300px] truncate font-bold text-texto">{row.name}</p>
                        <p className="mt-0.5 text-[10px] text-cinza">{row.brand} · estoque {row.stockQty}{row.active ? "" : " · inativo"}</p>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-texto">{row.views}</td>
                      <td className="px-3 py-3 text-right font-semibold text-texto">{row.carts}</td>
                      <td className="px-3 py-3 text-right font-bold text-rosa-profundo">{pct(row.carts, row.views)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-texto">{row.finalizedOrders}</td>
                      <td className="px-3 py-3 text-right font-semibold text-texto">{row.unitsSold}</td>
                      <td className="px-3 py-3 text-right font-bold text-texto">{money(row.revenue)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.tone}`}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-5 rounded-2xl border border-rosa/15 bg-white p-4 text-[11px] leading-5 text-cinza">
        <strong className="text-texto">Como interpretar:</strong> muita visualização e pouco carrinho sugere revisar preço, foto, descrição ou oferta. Carrinhos sem venda indicam intenção que não chegou ao fechamento. Produtos com venda finalizada comprovam conversão. Os eventos de comportamento só existem a partir da ativação do analytics próprio, portanto os primeiros dias ainda terão amostra pequena.
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-2xl font-extrabold text-texto">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p>
      <p className="mt-1 text-[11px] text-cinza">{label}</p>
    </div>
  );
}
