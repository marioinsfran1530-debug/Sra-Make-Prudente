import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getHomeProductOrderSettings } from "@/lib/home-merchandising";
import { ProductHomeOpportunityActions } from "@/components/admin/ProductHomeOpportunityActions";

export const dynamic = "force-dynamic";

type Period = "7d" | "30d" | "month" | "all";
type PerformanceFilter =
  | "all"
  | "opportunity"
  | "converts"
  | "cart_no_sale"
  | "seen_no_cart"
  | "offer"
  | "new"
  | "low_stock"
  | "out_of_stock"
  | "no_cost";

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Este mês" },
  { value: "all", label: "Todo período" },
];

const FILTERS: { value: PerformanceFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "opportunity", label: "🔥 Oportunidades" },
  { value: "converts", label: "✅ Converte" },
  { value: "cart_no_sale", label: "🛒 Carrinho sem venda" },
  { value: "seen_no_cart", label: "👀 Visto sem carrinho" },
  { value: "offer", label: "💸 Em oferta" },
  { value: "new", label: "🆕 Novidades" },
  { value: "low_stock", label: "⚠️ Estoque baixo" },
  { value: "out_of_stock", label: "❌ Sem estoque" },
  { value: "no_cost", label: "💰 Sem custo" },
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
  price: number;
  promoPrice: number | null;
  hasCatalogCost: boolean;
  featured: boolean;
  isNew: boolean;
  bestSeller: boolean;
  categoryId: string;
  categoryName: string;
  views: number;
  carts: number;
  finalizedOrders: number;
  unitsSold: number;
  revenue: number;
  revenueWithCost: number;
  knownCost: number;
};

type SignalKind = "converts" | "cart_no_sale" | "seen_no_cart" | "collecting";

function signal(row: ProductRow): { kind: SignalKind; label: string; tone: string } {
  if (row.finalizedOrders > 0) {
    return { kind: "converts", label: "Converte", tone: "text-green-700 bg-green-50 border-green-200" };
  }
  if (row.carts > 0) {
    return { kind: "cart_no_sale", label: "Intenção sem venda", tone: "text-amber-700 bg-amber-50 border-amber-200" };
  }
  if (row.views >= 5) {
    return { kind: "seen_no_cart", label: "Visto, sem carrinho", tone: "text-red-700 bg-red-50 border-red-200" };
  }
  return { kind: "collecting", label: "Coletando dados", tone: "text-cinza bg-creme border-rosa/10" };
}

function hasOffer(row: ProductRow) {
  return row.promoPrice !== null && row.promoPrice < row.price;
}

function intentionRate(row: ProductRow) {
  return row.views > 0 ? row.carts / row.views : 0;
}

function opportunityScore(row: ProductRow) {
  if (!row.active || row.stockQty <= 0) return -1;
  const rateBonus = intentionRate(row) >= 0.1 ? 5 : 0;
  const stockPenalty = row.stockQty <= 2 ? 8 : 0;
  return (
    row.finalizedOrders * 30 +
    row.carts * 6 +
    Math.min(row.views, 20) * 0.5 +
    rateBonus -
    stockPenalty
  );
}

function homeOpportunity(row: ProductRow) {
  return row.active && row.stockQty > 0 && (row.finalizedOrders > 0 || row.carts > 0);
}

function opportunityCopy(row: ProductRow) {
  if (row.stockQty <= 2 && row.finalizedOrders > 0) {
    return "Converte, mas o estoque está baixo. Reponha antes de aumentar muito a exposição.";
  }
  if (row.finalizedOrders > 0) {
    return `Já converteu em ${row.finalizedOrders} pedido(s). Boa candidata a ganhar espaço em Destaques ou Mais procurados.`;
  }
  if (row.carts > 0) {
    return `${row.carts} carrinho(s) sem venda. Há intenção: vale revisar oferta, foto ou preço antes de ampliar a exposição.`;
  }
  return "Ainda coletando sinais para decidir a exposição.";
}

function matchesFilter(row: ProductRow, filter: PerformanceFilter) {
  if (filter === "all") return true;
  if (filter === "opportunity") return homeOpportunity(row);
  if (filter === "converts") return row.finalizedOrders > 0;
  if (filter === "cart_no_sale") return row.carts > 0 && row.finalizedOrders === 0;
  if (filter === "seen_no_cart") return row.views >= 5 && row.carts === 0 && row.finalizedOrders === 0;
  if (filter === "offer") return hasOffer(row);
  if (filter === "new") return row.isNew;
  if (filter === "low_stock") return row.stockQty > 0 && row.stockQty <= 3;
  if (filter === "out_of_stock") return row.stockQty <= 0;
  if (filter === "no_cost") return !row.hasCatalogCost;
  return true;
}

function buildHref({
  period,
  filter,
  q,
  brand,
  category,
}: {
  period: Period;
  filter: PerformanceFilter;
  q: string;
  brand: string;
  category: string;
}) {
  const params = new URLSearchParams();
  if (period !== "7d") params.set("period", period);
  if (filter !== "all") params.set("filter", filter);
  if (q) params.set("q", q);
  if (brand) params.set("brand", brand);
  if (category) params.set("category", category);
  const query = params.toString();
  return `/admin/analise/produtos${query ? `?${query}` : ""}`;
}

export default async function ProductPerformancePage({
  searchParams,
}: {
  searchParams?: Promise<{
    period?: string;
    filter?: string;
    q?: string;
    brand?: string;
    category?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const requested = params?.period;
  const period: Period = PERIODS.some((item) => item.value === requested)
    ? (requested as Period)
    : "7d";
  const requestedFilter = params?.filter;
  const filter: PerformanceFilter = FILTERS.some((item) => item.value === requestedFilter)
    ? (requestedFilter as PerformanceFilter)
    : "all";
  const q = (params?.q ?? "").trim().slice(0, 100);
  const brand = (params?.brand ?? "").trim().slice(0, 100);
  const category = (params?.category ?? "").trim().slice(0, 100);

  const range = getPeriodRange(period);
  const analyticsWhere = range ? { createdAt: range } : {};
  const finalizedWhere = range ? { updatedAt: range } : {};

  const [behaviorGroups, finalizedOrders, merchandising] = await Promise.all([
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
            unitCost: true,
          },
        },
      },
    }),
    getHomeProductOrderSettings(),
  ]);

  const stats = new Map<
    string,
    Omit<
      ProductRow,
      | "id"
      | "name"
      | "brand"
      | "active"
      | "stockQty"
      | "price"
      | "promoPrice"
      | "hasCatalogCost"
      | "featured"
      | "isNew"
      | "bestSeller"
      | "categoryId"
      | "categoryName"
    >
  >();

  function ensure(productId: string) {
    const current = stats.get(productId);
    if (current) return current;
    const fresh = {
      views: 0,
      carts: 0,
      finalizedOrders: 0,
      unitsSold: 0,
      revenue: 0,
      revenueWithCost: 0,
      knownCost: 0,
    };
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
      const subtotal = Number(item.subtotal);
      current.unitsSold += item.qty;
      current.revenue += subtotal;
      if (item.unitCost !== null) {
        current.revenueWithCost += subtotal;
        current.knownCost += Number(item.unitCost) * item.qty;
      }
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
        select: {
          id: true,
          name: true,
          brand: true,
          active: true,
          stockQty: true,
          price: true,
          promoPrice: true,
          costPrice: true,
          featured: true,
          isNew: true,
          bestSeller: true,
          categoryId: true,
          category: { select: { name: true } },
        },
      })
    : [];

  const emptyStats = {
    views: 0,
    carts: 0,
    finalizedOrders: 0,
    unitsSold: 0,
    revenue: 0,
    revenueWithCost: 0,
    knownCost: 0,
  };

  const rows: ProductRow[] = products
    .map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      active: product.active,
      stockQty: product.stockQty,
      price: Number(product.price),
      promoPrice: product.promoPrice === null ? null : Number(product.promoPrice),
      hasCatalogCost: product.costPrice !== null,
      featured: product.featured,
      isNew: product.isNew,
      bestSeller: product.bestSeller,
      categoryId: product.categoryId,
      categoryName: product.category.name,
      ...(stats.get(product.id) ?? emptyStats),
    }))
    .sort((a, b) => b.views - a.views || b.carts - a.carts || b.revenue - a.revenue);

  const totalViews = rows.reduce((sum, item) => sum + item.views, 0);
  const totalCarts = rows.reduce((sum, item) => sum + item.carts, 0);
  const totalUnits = rows.reduce((sum, item) => sum + item.unitsSold, 0);
  const totalRevenue = rows.reduce((sum, item) => sum + item.revenue, 0);
  const revenueWithCost = rows.reduce((sum, item) => sum + item.revenueWithCost, 0);
  const totalKnownCost = rows.reduce((sum, item) => sum + item.knownCost, 0);
  const knownGrossProfit = revenueWithCost - totalKnownCost;

  const brands = [...new Set(rows.map((row) => row.brand).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  const categories = [
    ...new Map(rows.map((row) => [row.categoryId, row.categoryName] as const)).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));

  const normalizedQ = q.toLocaleLowerCase("pt-BR");
  const filteredRows = rows.filter((row) => {
    if (!matchesFilter(row, filter)) return false;
    if (brand && row.brand !== brand) return false;
    if (category && row.categoryId !== category) return false;
    if (
      normalizedQ &&
      !`${row.name} ${row.brand} ${row.categoryName}`.toLocaleLowerCase("pt-BR").includes(normalizedQ)
    ) {
      return false;
    }
    return true;
  });

  const homeCandidates = rows
    .filter(homeOpportunity)
    .sort((a, b) => opportunityScore(b) - opportunityScore(a))
    .slice(0, 6);

  const homeActionSettings = {
    featuredOrder: merchandising.homeFeaturedOrder,
    newOrder: merchandising.homeNewOrder,
    hiddenOffers: merchandising.homeHiddenOffers,
    hiddenFeatured: merchandising.homeHiddenFeatured,
    hiddenPopular: merchandising.homeHiddenPopular,
    hiddenNew: merchandising.homeHiddenNew,
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Inteligência comercial</p>
          <h1 className="font-serif text-2xl font-bold text-texto">Desempenho dos produtos</h1>
          <p className="mt-1 max-w-3xl text-sm text-cinza">
            Use os sinais de visualização, carrinho e venda para decidir o que merece espaço na Home. A análise não altera a vitrine sozinha: o ADM continua no controle.
          </p>
        </div>
        <Link
          href="/admin/analise"
          className="rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo"
        >
          Voltar para Análise
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {PERIODS.map((item) => {
          const active = item.value === period;
          return (
            <Link
              key={item.value}
              href={buildHref({ period: item.value, filter, q, brand, category })}
              className={`min-h-11 rounded-xl border px-3 py-2.5 text-center text-xs font-bold ${
                active ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-rosa/15 bg-white text-cinza"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Visualizações" value={totalViews} />
        <Metric label="Carrinhos" value={totalCarts} />
        <Metric label="Unidades vendidas" value={totalUnits} />
        <Metric label="Receita finalizada" value={money(totalRevenue)} />
        <Metric label="Lucro bruto conhecido" value={money(knownGrossProfit)} />
        <Metric label="Receita com custo informado" value={pct(revenueWithCost, totalRevenue)} />
      </div>

      <section className="mb-6 rounded-3xl border border-rosa/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rosa-profundo">Decisão de vitrine</p>
            <h2 className="mt-1 font-serif text-xl font-bold text-texto">Oportunidades para a Home</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-cinza">
              Priorizamos produtos ativos, com estoque e sinais reais de carrinho ou venda. Estoque baixo recebe alerta para evitar promover algo que pode acabar rápido.
            </p>
          </div>
          <Link
            href="/admin/loja/vitrine"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rosa/20 px-3 text-xs font-bold text-rosa-profundo"
          >
            Organizar Home
          </Link>
        </div>

        {homeCandidates.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-creme p-4 text-xs text-cinza">
            Ainda não há sinais suficientes neste período. Continue coletando visualizações, carrinhos e vendas.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {homeCandidates.map((row) => {
              const status = signal(row);
              return (
                <article key={row.id} className="rounded-2xl border border-rosa/10 bg-creme/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold leading-snug text-texto">{row.name}</h3>
                      <p className="mt-1 text-[11px] text-cinza">
                        {row.brand} · {row.categoryName} · estoque {row.stockQty}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.tone}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <SmallStat label="Vistas" value={row.views} />
                    <SmallStat label="Carrinhos" value={row.carts} />
                    <SmallStat label="Intenção" value={pct(row.carts, row.views)} />
                    <SmallStat label="Pedidos" value={row.finalizedOrders} />
                  </div>

                  <p className={`mt-3 rounded-xl px-3 py-2.5 text-[11px] leading-relaxed ${row.stockQty <= 2 ? "bg-amber-50 text-amber-800" : "bg-white text-cinza"}`}>
                    {opportunityCopy(row)}
                  </p>

                  <ProductHomeOpportunityActions
                    productId={row.id}
                    featured={row.featured}
                    isNew={row.isNew}
                    bestSeller={row.bestSeller}
                    hasOffer={hasOffer(row)}
                    settings={homeActionSettings}
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-5 rounded-3xl border border-rosa/10 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rosa-profundo">Filtros comerciais</p>
          <h2 className="mt-1 font-serif text-lg font-bold text-texto">Encontre o que merece ação</h2>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
          {FILTERS.map((item) => {
            const active = filter === item.value;
            return (
              <Link
                key={item.value}
                href={buildHref({ period, filter: item.value, q, brand, category })}
                className={`min-h-11 rounded-xl border px-2 py-2.5 text-center text-[11px] font-bold leading-tight ${
                  active ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-rosa/15 bg-creme/50 text-cinza"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <form method="get" className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto] md:items-end">
          {period !== "7d" && <input type="hidden" name="period" value={period} />}
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wide text-cinza">Buscar produto</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="Nome, marca ou categoria"
              className="mt-1 min-h-11 w-full rounded-xl border border-rosa/15 bg-white px-3 text-sm text-texto outline-none focus:border-rosa-profundo"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wide text-cinza">Marca</span>
            <select
              name="brand"
              defaultValue={brand}
              className="mt-1 min-h-11 w-full rounded-xl border border-rosa/15 bg-white px-3 text-sm text-texto outline-none focus:border-rosa-profundo"
            >
              <option value="">Todas</option>
              {brands.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wide text-cinza">Categoria</span>
            <select
              name="category"
              defaultValue={category}
              className="mt-1 min-h-11 w-full rounded-xl border border-rosa/15 bg-white px-3 text-sm text-texto outline-none focus:border-rosa-profundo"
            >
              <option value="">Todas</option>
              {categories.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 md:flex">
            <button type="submit" className="min-h-11 rounded-xl bg-rosa-profundo px-4 text-xs font-bold text-white">
              Filtrar
            </button>
            <Link
              href={buildHref({ period, filter: "all", q: "", brand: "", category: "" })}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rosa/15 px-4 text-xs font-bold text-cinza"
            >
              Limpar
            </Link>
          </div>
        </form>

        <p className="mt-3 text-[11px] text-cinza">
          Mostrando <strong className="text-texto">{filteredRows.length}</strong> de {rows.length} produto(s) com dados no período.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-rosa/10 px-5 py-4">
          <h2 className="font-bold text-texto">Produto por produto</h2>
          <p className="mt-1 text-[11px] text-cinza">
            Venda só considera pedidos FINALIZADOS. No celular, cada produto fica em um card completo para não exigir arrastar a tabela para o lado.
          </p>
        </div>

        {filteredRows.length === 0 ? (
          <p className="p-6 text-sm text-cinza">Nenhum produto corresponde aos filtros escolhidos.</p>
        ) : (
          <>
            <div className="divide-y divide-rosa/10 xl:hidden">
              {filteredRows.map((row) => {
                const status = signal(row);
                const hasHistoricalCost = row.revenueWithCost > 0;
                const grossProfit = row.revenueWithCost - row.knownCost;
                return (
                  <article key={row.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold leading-snug text-texto">{row.name}</h3>
                        <p className="mt-1 text-[11px] text-cinza">
                          {row.brand} · {row.categoryName} · estoque {row.stockQty}{row.active ? "" : " · inativo"}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold ${status.tone}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                      <SmallStat label="Vistas" value={row.views} />
                      <SmallStat label="Carrinhos" value={row.carts} />
                      <SmallStat label="Intenção" value={pct(row.carts, row.views)} />
                      <SmallStat label="Pedidos" value={row.finalizedOrders} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <DetailStat label="Unidades" value={row.unitsSold.toLocaleString("pt-BR")} />
                      <DetailStat label="Receita" value={money(row.revenue)} />
                      <DetailStat label="Lucro bruto" value={hasHistoricalCost ? money(grossProfit) : "—"} />
                      <DetailStat label="Margem" value={hasHistoricalCost ? pct(grossProfit, row.revenueWithCost) : "—"} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {hasOffer(row) && <Tag>Oferta</Tag>}
                      {row.featured && <Tag>Destaque</Tag>}
                      {row.bestSeller && <Tag>Mais procurado</Tag>}
                      {row.isNew && <Tag>Novidade</Tag>}
                      {!row.hasCatalogCost && <Tag>Sem custo</Tag>}
                      {row.stockQty > 0 && row.stockQty <= 3 && <Tag>Estoque baixo</Tag>}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/admin/produtos/${row.id}`}
                        className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-rosa/15 text-[11px] font-bold text-rosa-profundo"
                      >
                        Ver cadastro
                      </Link>
                      <Link
                        href="/admin/loja/vitrine"
                        className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-creme text-[11px] font-bold text-rosa-profundo"
                      >
                        Organizar Home
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto xl:block">
              <table className="min-w-[1120px] w-full text-left text-xs">
                <thead className="bg-creme/70 text-[10px] uppercase tracking-wide text-cinza">
                  <tr>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-3 py-3 text-right">Vistas</th>
                    <th className="px-3 py-3 text-right">Carrinhos</th>
                    <th className="px-3 py-3 text-right">Intenção</th>
                    <th className="px-3 py-3 text-right">Pedidos finais</th>
                    <th className="px-3 py-3 text-right">Unidades</th>
                    <th className="px-3 py-3 text-right">Receita</th>
                    <th className="px-3 py-3 text-right">Lucro bruto</th>
                    <th className="px-3 py-3 text-right">Margem</th>
                    <th className="px-4 py-3">Sinal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rosa/10">
                  {filteredRows.map((row) => {
                    const status = signal(row);
                    const hasHistoricalCost = row.revenueWithCost > 0;
                    const grossProfit = row.revenueWithCost - row.knownCost;
                    return (
                      <tr key={row.id} className="align-middle">
                        <td className="px-4 py-3">
                          <p className="max-w-[300px] truncate font-bold text-texto">{row.name}</p>
                          <p className="mt-0.5 text-[10px] text-cinza">{row.brand} · {row.categoryName} · estoque {row.stockQty}{row.active ? "" : " · inativo"}</p>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-texto">{row.views}</td>
                        <td className="px-3 py-3 text-right font-semibold text-texto">{row.carts}</td>
                        <td className="px-3 py-3 text-right font-bold text-rosa-profundo">{pct(row.carts, row.views)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-texto">{row.finalizedOrders}</td>
                        <td className="px-3 py-3 text-right font-semibold text-texto">{row.unitsSold}</td>
                        <td className="px-3 py-3 text-right font-bold text-texto">{money(row.revenue)}</td>
                        <td className="px-3 py-3 text-right font-bold text-texto">{hasHistoricalCost ? money(grossProfit) : "—"}</td>
                        <td className="px-3 py-3 text-right font-bold text-texto">{hasHistoricalCost ? pct(grossProfit, row.revenueWithCost) : "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.tone}`}>{status.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <div className="mt-5 rounded-2xl border border-rosa/15 bg-white p-4 text-[11px] leading-5 text-cinza">
        <strong className="text-texto">Como interpretar:</strong> muita visualização e pouco carrinho sugere revisar preço, foto, descrição ou oferta. Carrinhos sem venda indicam intenção que não chegou ao fechamento. Produtos que já convertem e têm estoque são os candidatos mais seguros para ganhar espaço na Home. O lucro bruto considera receita menos custo do produto e não desconta frete, taxas, impostos ou despesas operacionais.
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

function SmallStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white px-2 py-2.5">
      <p className="text-sm font-extrabold text-texto">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p>
      <p className="mt-0.5 text-[9px] uppercase tracking-wide text-cinza">{label}</p>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-rosa/10 px-3 py-2.5">
      <p className="text-[9px] uppercase tracking-wide text-cinza">{label}</p>
      <p className="mt-1 text-xs font-bold text-texto">{value}</p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-rosa/10 bg-creme px-2 py-1 text-[9px] font-bold text-cinza">
      {children}
    </span>
  );
}
