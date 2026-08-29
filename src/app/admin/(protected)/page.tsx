import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Package,
  ShoppingBag,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { computeStockStatus } from "@/lib/stock";
import { money } from "@/lib/money";

const STATUS_LABEL: Record<string, string> = {
  NOVO: "Novo",
  EM_CONFIRMACAO: "Em confirmação",
  CONFIRMADO: "Confirmado",
  SEPARANDO: "Separando",
  PRONTO_RETIRADA: "Pronto para retirada",
  SAIU_ENTREGA: "Saiu para entrega",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

const CHANNEL_LABEL: Record<string, string> = {
  CATALOGO: "Catálogo",
  WHATSAPP: "WhatsApp",
  LOJA_FISICA: "Loja física",
  MANUAL: "Manual",
};

const PENDING_STATUSES = [
  "NOVO",
  "EM_CONFIRMACAO",
  "CONFIRMADO",
  "SEPARANDO",
  "PRONTO_RETIRADA",
  "SAIU_ENTREGA",
] as const;

const FUNNEL_EVENTS = [
  "page_view",
  "product_view",
  "add_to_cart",
  "begin_checkout",
  "order_created",
] as const;

type Period = "today" | "7d" | "30d" | "month" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
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
  if (period === "all") return null;
  const { year, month, day } = getSaoPauloDateParts();
  const todayStart = saoPauloMidnightUtc(year, month, day);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  if (period === "today") return { gte: todayStart, lt: tomorrowStart };
  if (period === "7d" || period === "30d") {
    const start = new Date(todayStart);
    start.setUTCDate(start.getUTCDate() - (period === "7d" ? 6 : 29));
    return { gte: start, lt: tomorrowStart };
  }
  return { gte: saoPauloMidnightUtc(year, month, 1), lt: tomorrowStart };
}

function getPreviousRange(range: { gte: Date; lt: Date } | null) {
  if (!range) return null;
  const duration = range.lt.getTime() - range.gte.getTime();
  return {
    gte: new Date(range.gte.getTime() - duration),
    lt: new Date(range.gte),
  };
}

function ordersHref(status: string, period: Period) {
  return `/admin/pedidos?status=${encodeURIComponent(status)}&period=${period}`;
}

function pct(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function trendPct(current: number, previous: number) {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function isTechnicalOrigin(origin: string | null) {
  const normalized = origin?.trim().toLowerCase() ?? "";
  return normalized.includes("vercel") || normalized.includes("preview");
}

function analysisProductsHref(period: Period) {
  if (period === "today") return "/admin/analise/produtos";
  return period === "7d"
    ? "/admin/analise/produtos"
    : `/admin/analise/produtos?period=${period}`;
}

type ProductPerformance = {
  productId: string;
  name: string;
  brand: string;
  units: number;
  revenue: number;
  stockQty: number | null;
};

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null;

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedPeriod = resolvedSearchParams?.period;
  const period: Period = PERIODS.some((item) => item.value === requestedPeriod)
    ? (requestedPeriod as Period)
    : "today";

  const range = getPeriodRange(period);
  const previousRange = getPreviousRange(range);
  const finalizedDateFilter = range ? { updatedAt: range } : {};
  const canceledDateFilter = range ? { updatedAt: range } : {};
  const pendingDateFilter = range ? { createdAt: range } : {};
  const analyticsDateFilter = range ? { createdAt: range } : {};

  const [
    activeProducts,
    allProducts,
    recentOrders,
    finalizedOrders,
    previousFinalized,
    pendingOrders,
    canceledOrders,
    funnelEvents,
  ] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.product.findMany({
      where: { active: true },
      select: { id: true, stockQty: true },
    }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.order.findMany({
      where: { status: "FINALIZADO", ...finalizedDateFilter },
      select: {
        id: true,
        total: true,
        channel: true,
        items: {
          select: {
            productId: true,
            name: true,
            brand: true,
            qty: true,
            subtotal: true,
            unitCost: true,
          },
        },
      },
    }),
    previousRange
      ? prisma.order.aggregate({
          where: { status: "FINALIZADO", updatedAt: previousRange },
          _sum: { total: true },
          _count: { id: true },
        })
      : Promise.resolve(null),
    prisma.order.aggregate({
      where: { status: { in: [...PENDING_STATUSES] }, ...pendingDateFilter },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: { status: "CANCELADO", ...canceledDateFilter },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.analyticsEvent.findMany({
      where: {
        ...analyticsDateFilter,
        event: { in: [...FUNNEL_EVENTS] },
      },
      select: {
        event: true,
        sessionId: true,
        origin: true,
      },
    }),
  ]);

  const soldValue = finalizedOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const finalizedCount = finalizedOrders.length;
  const pendingValue = Number(pendingOrders._sum.total ?? 0);
  const canceledValue = Number(canceledOrders._sum.total ?? 0);
  const pendingCount = pendingOrders._count.id;
  const canceledCount = canceledOrders._count.id;
  const averageTicket = finalizedCount > 0 ? soldValue / finalizedCount : 0;

  const previousSoldValue = previousFinalized
    ? Number(previousFinalized._sum.total ?? 0)
    : 0;
  const previousCount = previousFinalized?._count.id ?? 0;
  const revenueTrend = trendPct(soldValue, previousSoldValue);
  const orderTrend = trendPct(finalizedCount, previousCount);

  const lowStock = allProducts.filter(
    (product) => computeStockStatus(product.stockQty) === "ULTIMAS"
  ).length;
  const outOfStock = allProducts.filter(
    (product) => computeStockStatus(product.stockQty) === "INDISPONIVEL"
  ).length;

  let totalUnits = 0;
  let revenueWithCost = 0;
  let knownCost = 0;
  const productMap = new Map<
    string,
    { productId: string; name: string; brand: string; units: number; revenue: number }
  >();
  const brandMap = new Map<string, { units: number; revenue: number }>();
  const channelMap = new Map<string, { orders: number; revenue: number }>();

  for (const order of finalizedOrders) {
    const channel = CHANNEL_LABEL[order.channel] ?? order.channel;
    const channelStats = channelMap.get(channel) ?? { orders: 0, revenue: 0 };
    channelStats.orders += 1;
    channelStats.revenue += Number(order.total);
    channelMap.set(channel, channelStats);

    for (const item of order.items) {
      const subtotal = Number(item.subtotal);
      totalUnits += item.qty;

      const current = productMap.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        brand: item.brand?.trim() || "Sem marca",
        units: 0,
        revenue: 0,
      };
      current.units += item.qty;
      current.revenue += subtotal;
      productMap.set(item.productId, current);

      const brand = item.brand?.trim() || "Sem marca";
      const brandStats = brandMap.get(brand) ?? { units: 0, revenue: 0 };
      brandStats.units += item.qty;
      brandStats.revenue += subtotal;
      brandMap.set(brand, brandStats);

      if (item.unitCost !== null) {
        revenueWithCost += subtotal;
        knownCost += Number(item.unitCost) * item.qty;
      }
    }
  }

  const basketSize = finalizedCount > 0 ? totalUnits / finalizedCount : 0;
  const costCoverage = soldValue > 0 ? (revenueWithCost / soldValue) * 100 : 0;
  const grossProfitKnown = revenueWithCost - knownCost;
  const grossMarginKnown = revenueWithCost > 0 ? (grossProfitKnown / revenueWithCost) * 100 : 0;

  const rawTopProducts = Array.from(productMap.values())
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, 5);

  const topProductIds = rawTopProducts.map((item) => item.productId);
  const currentTopStock = topProductIds.length
    ? await prisma.product.findMany({
        where: { id: { in: topProductIds } },
        select: { id: true, stockQty: true },
      })
    : [];
  const stockMap = new Map(currentTopStock.map((product) => [product.id, product.stockQty]));

  const topProducts: ProductPerformance[] = rawTopProducts.map((item) => ({
    ...item,
    stockQty: stockMap.get(item.productId) ?? null,
  }));

  const topBrands = Array.from(brandMap.entries())
    .map(([brand, stats]) => ({ brand, ...stats }))
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, 4);

  const channels = Array.from(channelMap.entries())
    .map(([channel, stats]) => ({ channel, ...stats }))
    .sort((a, b) => b.revenue - a.revenue);

  const funnel = {
    visitors: new Set<string>(),
    products: new Set<string>(),
    carts: new Set<string>(),
    checkouts: new Set<string>(),
    orders: new Set<string>(),
  };

  for (const event of funnelEvents) {
    if (isTechnicalOrigin(event.origin)) continue;
    if (event.event === "page_view") funnel.visitors.add(event.sessionId);
    if (event.event === "product_view") funnel.products.add(event.sessionId);
    if (event.event === "add_to_cart") funnel.carts.add(event.sessionId);
    if (event.event === "begin_checkout") funnel.checkouts.add(event.sessionId);
    if (event.event === "order_created") funnel.orders.add(event.sessionId);
  }

  const catalogConversion =
    funnel.visitors.size > 0 ? (funnel.orders.size / funnel.visitors.size) * 100 : 0;

  const criticalTopProducts = topProducts.filter(
    (product) =>
      product.stockQty !== null &&
      computeStockStatus(product.stockQty) !== "DISPONIVEL"
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-rosa-profundo">
            Visão geral
          </p>
          <h1 className="font-serif text-2xl font-bold text-texto">Dashboard</h1>
          <p className="mt-1 text-sm text-cinza">
            O que vendeu, como o catálogo converteu e onde a loja precisa agir.
          </p>
        </div>
        <Link
          href="/admin/pedidos"
          className="rounded-xl px-4 py-2.5 text-center text-xs font-bold text-white"
          style={{ backgroundColor: "#E4127B" }}
        >
          Ver pedidos
        </Link>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-[11px] font-bold text-texto">Período</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {PERIODS.map((item) => {
            const active = period === item.value;
            return (
              <Link
                key={item.value}
                href={item.value === "today" ? "/admin" : `/admin?period=${item.value}`}
                className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  active
                    ? "border-rosa-profundo text-white"
                    : "border-rosa/20 bg-white text-texto hover:bg-rosa/5"
                }`}
                style={active ? { backgroundColor: "#E4127B" } : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <section
        className="mb-4 overflow-hidden rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 to-white"
        style={{ boxShadow: "0 4px 20px rgba(35,20,42,0.06)" }}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-green-700">Vendas no período</p>
              <p className="mt-1 text-3xl font-extrabold text-green-700 sm:text-4xl">
                {money(soldValue)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-cinza">
                <span>
                  {finalizedCount} {finalizedCount === 1 ? "venda finalizada" : "vendas finalizadas"}
                </span>
                {revenueTrend !== null && (
                  <TrendBadge value={revenueTrend} label="receita" />
                )}
                {orderTrend !== null && (
                  <TrendBadge value={orderTrend} label="pedidos" subtle />
                )}
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100 text-green-700">
              <CheckCircle2 size={22} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryMetric label="Vendas" value={finalizedCount.toLocaleString("pt-BR")} />
            <SummaryMetric label="Ticket médio" value={money(averageTicket)} />
            <SummaryMetric label="Itens vendidos" value={totalUnits.toLocaleString("pt-BR")} />
            <SummaryMetric
              label="Itens por venda"
              value={basketSize.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-green-100 bg-white/70">
          <Link
            href={ordersHref("pending", period)}
            className="border-r border-green-100 px-5 py-3 transition hover:bg-amber-50"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Pendentes</p>
            <p className={`mt-1 text-sm font-extrabold ${pendingCount > 0 ? "text-amber-700" : "text-texto"}`}>
              {pendingCount} · {money(pendingValue)}
            </p>
          </Link>
          <Link
            href={ordersHref("CANCELADO", period)}
            className="px-5 py-3 transition hover:bg-red-50"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Cancelados</p>
            <p className={`mt-1 text-sm font-extrabold ${canceledCount > 0 ? "text-red-700" : "text-texto"}`}>
              {canceledCount} · {money(canceledValue)}
            </p>
          </Link>
        </div>
      </section>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section
          className="rounded-2xl bg-white p-5"
          style={{ boxShadow: "0 2px 12px rgba(35,20,42,0.06)" }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-rosa-profundo">
                Catálogo
              </p>
              <h2 className="mt-0.5 text-base font-bold text-texto">Funil de conversão</h2>
            </div>
            <Link href="/admin/analise" className="text-[11px] font-bold text-rosa-profundo">
              Ver análise →
            </Link>
          </div>

          <div className="grid grid-cols-5 gap-1.5 text-center">
            <FunnelStep label="Visitantes" value={funnel.visitors.size} />
            <FunnelStep label="Produtos" value={funnel.products.size} />
            <FunnelStep label="Carrinho" value={funnel.carts.size} />
            <FunnelStep label="Checkout" value={funnel.checkouts.size} />
            <FunnelStep label="Pedidos" value={funnel.orders.size} />
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-rosa/5 px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">
                Conversão do catálogo
              </p>
              <p className="mt-1 text-xl font-extrabold text-rosa-profundo">
                {pct(catalogConversion)}
              </p>
            </div>
            <BarChart3 size={22} className="text-rosa-profundo" />
          </div>
        </section>

        <section
          className="rounded-2xl bg-white p-5"
          style={{ boxShadow: "0 2px 12px rgba(35,20,42,0.06)" }}
        >
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rosa-profundo">
              Operação
            </p>
            <h2 className="mt-0.5 text-base font-bold text-texto">Saúde do estoque</h2>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StockMetric
              href="/admin/produtos?status=active"
              value={activeProducts}
              label="Ativos"
              icon={<Package size={17} />}
            />
            <StockMetric
              href="/admin/produtos?status=ULTIMAS"
              value={lowStock}
              label="Últimas"
              icon={<AlertTriangle size={17} />}
              tone={lowStock > 0 ? "warning" : "normal"}
            />
            <StockMetric
              href="/admin/produtos?status=INDISPONIVEL"
              value={outOfStock}
              label="Sem estoque"
              icon={<ShoppingBag size={17} />}
              tone={outOfStock > 0 ? "danger" : "normal"}
            />
          </div>

          {(criticalTopProducts.length > 0 || (soldValue > 0 && costCoverage < 80)) && (
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3">
              <p className="text-xs font-bold text-amber-800">Atenção</p>
              {criticalTopProducts.length > 0 && (
                <p className="mt-1 text-[11px] leading-5 text-amber-800">
                  {criticalTopProducts.length} dos produtos mais vendidos estão com estoque baixo ou zerado.
                </p>
              )}
              {soldValue > 0 && costCoverage < 80 && (
                <p className="mt-1 text-[11px] leading-5 text-amber-800">
                  Custos conhecidos cobrem {pct(costCoverage)} da receita; margem ainda não deve ser tratada como total.
                </p>
              )}
            </div>
          )}

          {soldValue > 0 && costCoverage >= 80 && (
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-green-50 p-3">
              <div>
                <p className="text-[10px] text-cinza">Lucro bruto conhecido</p>
                <p className="mt-1 text-sm font-extrabold text-green-700">
                  {money(grossProfitKnown)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-cinza">Margem conhecida</p>
                <p className="mt-1 text-sm font-extrabold text-green-700">
                  {pct(grossMarginKnown)}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <section
          className="rounded-2xl bg-white"
          style={{ boxShadow: "0 2px 12px rgba(35,20,42,0.06)" }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-rosa/10 px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-rosa-profundo">
                Ranking
              </p>
              <h2 className="mt-0.5 text-base font-bold text-texto">Produtos mais vendidos</h2>
            </div>
            <Link
              href={analysisProductsHref(period)}
              className="text-[11px] font-bold text-rosa-profundo"
            >
              Ver desempenho →
            </Link>
          </div>

          {topProducts.length === 0 ? (
            <p className="p-5 text-sm text-cinza">Ainda não há vendas finalizadas neste período.</p>
          ) : (
            <div className="divide-y divide-rosa/10">
              {topProducts.map((product, index) => {
                const stockStatus =
                  product.stockQty === null ? null : computeStockStatus(product.stockQty);
                return (
                  <div key={product.productId} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rosa/10 text-xs font-extrabold text-rosa-profundo">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-texto">{product.name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-cinza">{product.brand}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-extrabold text-texto">
                        {product.units} un.
                      </p>
                      <p className="mt-0.5 text-[10px] text-cinza">{money(product.revenue)}</p>
                      {stockStatus && stockStatus !== "DISPONIVEL" && (
                        <p className={`mt-0.5 text-[9px] font-bold ${stockStatus === "INDISPONIVEL" ? "text-red-600" : "text-amber-600"}`}>
                          estoque {product.stockQty}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid gap-4">
          <section
            className="rounded-2xl bg-white p-5"
            style={{ boxShadow: "0 2px 12px rgba(35,20,42,0.06)" }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Trophy size={17} className="text-rosa-profundo" />
              <h2 className="text-sm font-bold text-texto">Marcas que mais venderam</h2>
            </div>
            {topBrands.length === 0 ? (
              <p className="text-xs text-cinza">Sem vendas no período.</p>
            ) : (
              <div className="grid gap-2">
                {topBrands.map((item, index) => (
                  <div key={item.brand} className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-xs text-texto">
                      <span className="mr-2 font-bold text-cinza">{index + 1}.</span>
                      {item.brand}
                    </p>
                    <p className="shrink-0 text-xs font-bold text-texto">{item.units} un.</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section
            className="rounded-2xl bg-white p-5"
            style={{ boxShadow: "0 2px 12px rgba(35,20,42,0.06)" }}
          >
            <div className="mb-3 flex items-center gap-2">
              <ShoppingCart size={17} className="text-rosa-profundo" />
              <h2 className="text-sm font-bold text-texto">Vendas por canal</h2>
            </div>
            {channels.length === 0 ? (
              <p className="text-xs text-cinza">Sem vendas no período.</p>
            ) : (
              <div className="grid gap-2">
                {channels.map((item) => (
                  <div key={item.channel} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-texto">{item.channel}</p>
                      <p className="text-[10px] text-cinza">
                        {item.orders} {item.orders === 1 ? "venda" : "vendas"}
                      </p>
                    </div>
                    <p className="text-xs font-extrabold text-rosa-profundo">
                      {money(item.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-texto">Pedidos recentes</h2>
              <p className="text-xs text-cinza">Últimos pedidos da loja, independentemente do período acima</p>
            </div>
            <Link href="/admin/pedidos" className="text-xs font-bold text-rosa-profundo">
              Ver todos
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentOrders.length === 0 && (
              <div className="rounded-2xl bg-white p-5">
                <p className="text-xs text-cinza">Nenhum pedido ainda.</p>
              </div>
            )}
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/pedidos/${order.id}`}
                className="group flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 transition hover:-translate-y-0.5"
                style={{ boxShadow: "0 2px 12px rgba(35,20,42,0.06)" }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-texto">
                      #{order.number} — {order.customerName}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-[10px] text-cinza">
                    {new Date(order.createdAt).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-extrabold text-rosa-profundo">
                    {money(Number(order.total))}
                  </p>
                  <p className="mt-0.5 text-[9px] text-cinza">
                    {STATUS_LABEL[order.status] ?? order.status}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside>
          <h2 className="mb-3 text-base font-bold text-texto">Acesso rápido</h2>
          <div
            className="rounded-2xl bg-white p-4"
            style={{ boxShadow: "0 2px 12px rgba(35,20,42,0.06)" }}
          >
            <div className="grid gap-2">
              <QuickLink href="/admin/pedidos" title="Pedidos" description="Acompanhar e finalizar vendas" />
              <QuickLink href="/admin/produtos" title="Produtos" description="Estoque, preços e destaques" />
              <QuickLink href="/admin/analise" title="Análise" description="Funil, buscas e oportunidades" />
              <QuickLink href="/admin/categorias" title="Categorias" description="Organizar o catálogo" />
              <QuickLink href="/admin/loja" title="Loja" description="Endereço e informações públicas" />
              {session.role === "ADMIN" && (
                <QuickLink href="/admin/usuarios" title="Usuários" description="Acessos e permissões" />
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TrendBadge({
  value,
  label,
  subtle = false,
}: {
  value: number;
  label: string;
  subtle?: boolean;
}) {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${
        subtle
          ? "bg-white text-cinza"
          : positive
            ? "bg-green-100 text-green-700"
            : "bg-red-50 text-red-700"
      }`}
    >
      <Icon size={11} />
      {positive ? "+" : ""}
      {value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% {label}
    </span>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-green-100 bg-white/80 px-3 py-3">
      <p className="text-sm font-extrabold text-texto">{value}</p>
      <p className="mt-0.5 text-[10px] text-cinza">{label}</p>
    </div>
  );
}

function FunnelStep({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-creme/70 px-1.5 py-3">
      <p className="text-sm font-extrabold text-texto">{value.toLocaleString("pt-BR")}</p>
      <p className="mt-1 truncate text-[8px] font-bold uppercase tracking-wide text-cinza">
        {label}
      </p>
    </div>
  );
}

function StockMetric({
  href,
  value,
  label,
  icon,
  tone = "normal",
}: {
  href: string;
  value: number;
  label: string;
  icon: React.ReactNode;
  tone?: "normal" | "warning" | "danger";
}) {
  const tones = {
    normal: "bg-creme text-texto",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
  };
  return (
    <Link href={href} className={`rounded-xl p-3 transition hover:-translate-y-0.5 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-lg font-extrabold">{value.toLocaleString("pt-BR")}</p>
        {icon}
      </div>
      <p className="mt-1 text-[10px] font-bold">{label}</p>
    </Link>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="rounded-xl border border-rosa/10 p-3 transition hover:bg-rosa/5">
      <p className="text-xs font-bold text-texto">{title}</p>
      <p className="mt-0.5 text-[10px] text-cinza">{description}</p>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "FINALIZADO"
      ? "bg-green-50 text-green-700"
      : status === "CANCELADO"
        ? "bg-red-50 text-red-700"
        : status === "NOVO"
          ? "bg-rosa/10 text-rosa-profundo"
          : "bg-amber-50 text-amber-700";

  return (
    <span className={`hidden whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold sm:inline-flex ${classes}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
