import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { productPath } from "@/lib/product-url";
import {
  abcHref,
  buildAbcRows,
  filterRows,
  hasActiveFilters,
  HIGH_TRAFFIC_VIEWS,
  LOW_CONVERSION_PCT,
  LOW_VISIBILITY_VIEWS,
  nextLimit,
  parseAbcParams,
  periodLengthDays,
  REPLENISH_LEAD_DAYS,
  seoGaps,
  type AbcRow,
  type Curve,
  type Metric,
  type Period,
  type SeoGap,
  type SignalKey,
  type SoldProduct,
} from "@/lib/abc-analysis";

export const dynamic = "force-dynamic";

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

const CURVE_COPY: Record<Curve, { range: string; detail: string }> = {
  A: {
    range: "até ~80% da base",
    detail:
      "Carregam a loja. Nunca podem faltar: confira o estoque toda semana, capriche em foto, descrição e ALT, e use como destaque na home e nos anúncios.",
  },
  B: {
    range: "de ~80% a ~95%",
    detail:
      "Faixa intermediária e candidata a subir para A. Melhore a página, teste promoção ou kit com itens da curva A e acompanhe o giro.",
  },
  C: {
    range: "últimos ~5%",
    detail:
      "Cauda longa. Evite estoque parado: compre só sob demanda ou em kit, avalie liquidar e reveja se ainda vale manter no catálogo.",
  },
};

const SIGNAL_COPY: Record<
  SignalKey,
  { label: string; title: string; advice: string; tone: string }
> = {
  ruptura: {
    label: "Sem estoque",
    title: "Sem estoque na curva A/B",
    advice: "Produtos que vendem bem e estão zerados. Cada dia parado é venda perdida: priorize a compra.",
    tone: "border-red-200 bg-red-50 text-red-700",
  },
  reposicao: {
    label: "Repor logo",
    title: "Estoque acabando",
    advice: `O estoque dura menos de ${REPLENISH_LEAD_DAYS} dias no ritmo do período, menos que o prazo de uma compra na Shopee.`,
    tone: "border-amber-200 bg-amber-50 text-amber-800",
  },
  conteudo: {
    label: "Página fraca",
    title: "Página a melhorar (SEO)",
    advice: "Produtos A/B sem foto, descrição, ALT ou nome ideal. São os que mais vendem: texto e imagem melhores sustentam ranking e conversão.",
    tone: "border-purple-200 bg-purple-50 text-roxo",
  },
  vitrine: {
    label: "Pouca vitrine",
    title: "Vende, mas poucos visitam",
    advice: `Curva A com menos de ${LOW_VISIBILITY_VIEWS} visitas à página. Teste destaque na home, anúncio e divulgação para escalar.`,
    tone: "border-sky-200 bg-sky-50 text-sky-800",
  },
  conversao: {
    label: "Pouco pedido",
    title: "Muito visto, pouco pedido",
    advice: `Mais de ${HIGH_TRAFFIC_VIEWS} visitas e conversão abaixo de ${LOW_CONVERSION_PCT.toLocaleString("pt-BR")}%. Revise foto, preço, descrição e disponibilidade.`,
    tone: "border-rose-200 bg-rose-50 text-rose-800",
  },
};

const SIGNAL_ORDER: SignalKey[] = ["ruptura", "reposicao", "conteudo", "vitrine", "conversao"];

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

function curveTone(curve: Curve) {
  if (curve === "A") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (curve === "B") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function curveRing(curve: Curve) {
  if (curve === "A") return "ring-emerald-500";
  if (curve === "B") return "ring-amber-500";
  return "ring-slate-400";
}

function stockOf(product: { stockQty: number; variants: { stockQty: number }[] }) {
  return product.variants.length > 0
    ? product.variants.reduce((sum, variant) => sum + variant.stockQty, 0)
    : product.stockQty;
}

function conversionLabel(value: number | null) {
  if (value === null) return "—";
  return value > 100 ? ">100%" : pct(value);
}

function coverageTone(days: number | null) {
  if (days === null) return "text-cinza";
  if (days < REPLENISH_LEAD_DAYS) return "text-red-700";
  if (days < 15) return "text-amber-700";
  return "text-texto";
}

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosa-profundo";

export default async function CurvaAbcPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseAbcParams(searchParams ? await searchParams : undefined);
  const { period, metric } = params;
  const range = getPeriodRange(period);

  const searchesSince = new Date();
  searchesSince.setDate(searchesSince.getDate() - 30);

  const [orders, products, behaviorGroups, zeroResultSearches] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: "FINALIZADO",
        ...(range ? { updatedAt: range } : {}),
      },
      select: {
        id: true,
        updatedAt: true,
        items: {
          select: {
            productId: true,
            name: true,
            brand: true,
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
        sku: true,
        description: true,
        stockQty: true,
        category: { select: { name: true, slug: true } },
        images: { select: { alt: true } },
        variants: {
          where: { active: true },
          select: { stockQty: true },
        },
      },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["productId", "event"],
      where: {
        createdAt: range,
        productId: { not: null },
        event: { in: ["product_view", "add_to_cart"] },
      },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.count({
      where: {
        event: "search",
        itemCount: 0,
        createdAt: { gte: searchesSince },
        OR: [{ context: null }, { context: { not: "search_submit" } }],
      },
    }),
  ]);

  // ---------- Vendas por produto ----------

  const salesMap = new Map<
    string,
    { units: number; revenue: number; orders: number; name: string; brand: string }
  >();
  let oldestSaleAt: Date | null = null;

  for (const order of orders) {
    if (!oldestSaleAt || order.updatedAt < oldestSaleAt) oldestSaleAt = order.updatedAt;
    const productIdsInOrder = new Set<string>();

    for (const item of order.items) {
      const current = salesMap.get(item.productId) ?? {
        units: 0,
        revenue: 0,
        orders: 0,
        name: item.name,
        brand: item.brand?.trim() || "Sem marca",
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

  const behavior = new Map<string, { views: number; carts: number }>();
  for (const group of behaviorGroups) {
    if (!group.productId) continue;
    const current = behavior.get(group.productId) ?? { views: 0, carts: 0 };
    if (group.event === "product_view") current.views = group._count._all;
    if (group.event === "add_to_cart") current.carts = group._count._all;
    behavior.set(group.productId, current);
  }

  const productMap = new Map(products.map((product) => [product.id, product]));

  // Produtos vendidos que hoje estão inativos: busca os dados reais (estoque,
  // nome atual) em vez de tratá-los como "não identificados". Os removidos de
  // vez usam o nome e a marca gravados no próprio item do pedido.
  const missingProductIds = Array.from(salesMap.keys()).filter((id) => !productMap.has(id));
  const inactiveProducts = missingProductIds.length
    ? await prisma.product.findMany({
        where: { id: { in: missingProductIds } },
        select: {
          id: true,
          name: true,
          brand: true,
          sku: true,
          description: true,
          stockQty: true,
          category: { select: { name: true, slug: true } },
          images: { select: { alt: true } },
          variants: { select: { stockQty: true } },
        },
      })
    : [];
  const inactiveMap = new Map(inactiveProducts.map((product) => [product.id, product]));

  const soldProducts: SoldProduct[] = Array.from(salesMap.entries()).map(
    ([productId, sales]) => {
      const record = productMap.get(productId) ?? inactiveMap.get(productId);
      const traffic = behavior.get(productId);

      return {
        productId,
        name: record?.name ?? sales.name,
        brand: record?.brand ?? sales.brand,
        sku: record?.sku ?? null,
        categorySlug: record?.category.slug ?? null,
        categoryName: record?.category.name ?? null,
        stockQty: record ? stockOf(record) : 0,
        inCatalog: productMap.has(productId),
        hasRecord: Boolean(record),
        units: sales.units,
        revenue: sales.revenue,
        orders: sales.orders,
        views: traffic?.views ?? 0,
        carts: traffic?.carts ?? 0,
        gaps: record ? seoGaps(record) : [],
      };
    }
  );

  const { day: dayOfMonth } = getSaoPauloDateParts();
  const periodDays = periodLengthDays(period, { dayOfMonth, oldestSaleAt, now: new Date() });

  const allRows = buildAbcRows(soldProducts, metric, periodDays);

  const totalRevenue = allRows.reduce((sum, row) => sum + row.revenue, 0);
  const totalUnits = allRows.reduce((sum, row) => sum + row.units, 0);
  const baseTotal = metric === "revenue" ? totalRevenue : totalUnits;

  const curveSummary = (["A", "B", "C"] as const).map((curve) => {
    const rows = allRows.filter((row) => row.curve === curve);
    const baseValue = rows.reduce((sum, row) => sum + row.baseValue, 0);
    return {
      curve,
      items: rows.length,
      baseValue,
      share: baseTotal > 0 ? (baseValue / baseTotal) * 100 : 0,
      productsShare: allRows.length > 0 ? (rows.length / allRows.length) * 100 : 0,
    };
  });

  const unsoldActive = products.filter((product) => !salesMap.has(product.id));

  // Páginas com tráfego que não viraram pedido: dinheiro de divulgação sem retorno.
  const visitedWithoutSale = unsoldActive
    .map((product) => ({
      product,
      views: behavior.get(product.id)?.views ?? 0,
      carts: behavior.get(product.id)?.carts ?? 0,
      stock: stockOf(product),
      gaps: seoGaps(product),
    }))
    .filter((item) => item.views >= LOW_VISIBILITY_VIEWS)
    .sort((a, b) => b.views - a.views || b.carts - a.carts)
    .slice(0, 5);

  // ---------- Filtros ----------

  const categoryOptions = Array.from(
    allRows
      .reduce((map, row) => {
        if (!row.categorySlug || !row.categoryName) return map;
        const current = map.get(row.categorySlug) ?? { name: row.categoryName, count: 0 };
        current.count += 1;
        map.set(row.categorySlug, current);
        return map;
      }, new Map<string, { name: string; count: number }>())
      .entries()
  )
    .map(([slug, value]) => ({ slug, ...value }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));

  const filtered = filterRows(allRows, params);
  const visible = params.limit === "all" ? filtered : filtered.slice(0, params.limit);
  const more = nextLimit(params.limit);
  const filtering = hasActiveFilters(params);

  // Os números do radar respeitam os demais filtros, para baterem com a lista.
  const radarBase = filterRows(allRows, { ...params, signal: null });
  const radarCounts = Object.fromEntries(
    SIGNAL_ORDER.map((key) => [key, radarBase.filter((row) => row.signals.includes(key)).length])
  ) as Record<SignalKey, number>;

  const filteredBase = filtered.reduce((sum, row) => sum + row.baseValue, 0);
  const filteredShare = baseTotal > 0 ? (filteredBase / baseTotal) * 100 : 0;
  const filteredRevenue = filtered.reduce((sum, row) => sum + row.revenue, 0);
  const filteredUnits = filtered.reduce((sum, row) => sum + row.units, 0);

  const activeCategoryName =
    categoryOptions.find((option) => option.slug === params.cat)?.name ?? params.cat;

  const activeChips: { label: string; href: string }[] = [];
  if (params.curve) activeChips.push({ label: `Curva ${params.curve}`, href: abcHref(params, { curve: null }) });
  if (params.signal) activeChips.push({ label: SIGNAL_COPY[params.signal].title, href: abcHref(params, { signal: null }) });
  if (params.cat) activeChips.push({ label: `Categoria: ${activeCategoryName}`, href: abcHref(params, { cat: null }) });
  if (params.q) activeChips.push({ label: `Busca: “${params.q}”`, href: abcHref(params, { q: "" }) });

  const clearHref = abcHref(params, { curve: null, signal: null, cat: null, q: "" });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">
            Inteligência de estoque
          </p>
          <h1 className="font-serif text-2xl font-bold text-texto">Curva ABC de vendas</h1>
          <p className="mt-1 max-w-3xl text-sm text-cinza">
            Descubra quais produtos concentram as vendas e use a classificação A, B e C para priorizar compra, estoque, exposição e a qualidade da página de cada produto.
          </p>
        </div>

        <Link
          href="/admin/analise"
          className={`rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-center text-xs font-bold text-rosa-profundo ${focusRing}`}
        >
          Voltar para análise
        </Link>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {PERIODS.map((item) => {
          const active = item.value === period;
          return (
            <Link
              key={item.value}
              href={abcHref(params, { period: item.value })}
              aria-current={active ? "true" : undefined}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${focusRing} ${
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

      <div className="mb-4 flex flex-wrap gap-2">
        {METRICS.map((item) => {
          const active = item.value === metric;
          return (
            <Link
              key={item.value}
              href={abcHref(params, { metric: item.value })}
              aria-current={active ? "true" : undefined}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${focusRing} ${
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

      <form
        action="/admin/analise/abc"
        method="get"
        role="search"
        className="mb-3 flex flex-col gap-2 sm:flex-row"
      >
        <input type="hidden" name="period" value={period} />
        <input type="hidden" name="metric" value={metric} />
        {params.curve && <input type="hidden" name="curve" value={params.curve} />}
        {params.signal && <input type="hidden" name="signal" value={params.signal} />}

        <label className="sr-only" htmlFor="abc-q">
          Buscar produto, marca ou SKU
        </label>
        <input
          id="abc-q"
          type="search"
          name="q"
          defaultValue={params.q}
          maxLength={80}
          autoComplete="off"
          placeholder="Buscar produto, marca, SKU ou categoria…"
          className="min-w-0 flex-1 rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-sm text-texto placeholder:text-cinza/70 focus:border-rosa-profundo focus:outline-none focus:ring-2 focus:ring-rosa-profundo/20"
        />

        <label className="sr-only" htmlFor="abc-cat">
          Filtrar por categoria
        </label>
        <select
          id="abc-cat"
          name="cat"
          defaultValue={params.cat ?? ""}
          className="rounded-xl border border-rosa/20 bg-white px-3 py-2.5 text-sm text-texto focus:border-rosa-profundo focus:outline-none focus:ring-2 focus:ring-rosa-profundo/20 sm:max-w-[14rem]"
        >
          <option value="">Todas as categorias</option>
          {categoryOptions.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.name} ({option.count})
            </option>
          ))}
        </select>

        <button
          type="submit"
          className={`rounded-xl bg-rosa-profundo px-5 py-2.5 text-sm font-bold text-white ${focusRing}`}
        >
          Buscar
        </button>
      </form>

      {activeChips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
          {activeChips.map((chip) => (
            <Link
              key={chip.label}
              href={chip.href}
              aria-label={`Remover filtro: ${chip.label}`}
              className={`inline-flex items-center gap-1.5 rounded-full border border-rosa-profundo/30 bg-rosa-profundo/5 px-3 py-1.5 text-[11px] font-bold text-rosa-profundo ${focusRing}`}
            >
              {chip.label}
              <span aria-hidden="true">×</span>
            </Link>
          ))}
          <Link href={clearHref} className={`text-[11px] font-bold text-cinza underline ${focusRing}`}>
            Limpar tudo
          </Link>
        </div>
      )}

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryMetric
          label="Faturamento"
          value={money(totalRevenue)}
          helper="vendas finalizadas"
        />
        <SummaryMetric
          label="Itens vendidos"
          value={number(totalUnits)}
          helper={`${allRows.length} produtos vendidos`}
        />
        <SummaryMetric
          label="Pedidos"
          value={number(orders.length)}
          helper="com status finalizado"
        />
        <SummaryMetric
          label="Sem venda no período"
          value={number(unsoldActive.length)}
          helper="produtos ativos"
        />
      </section>

      <section className="mb-5 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="font-bold text-texto">Distribuição da curva</h2>
          <p className="mt-1 text-xs leading-5 text-cinza">
            A classificação usa a métrica selecionada e acumula a participação dos produtos do maior para o menor.
            As faixas são aproximadas: A até 80%, B de 80% a 95% e C no restante.{" "}
            <strong className="font-bold text-texto">Toque em uma curva para ver só os produtos dela.</strong>
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {curveSummary.map((item) => {
            const active = params.curve === item.curve;
            return (
              <Link
                key={item.curve}
                href={abcHref(params, { curve: active ? null : item.curve })}
                aria-current={active ? "true" : undefined}
                aria-label={
                  active
                    ? `Curva ${item.curve} selecionada. Toque para remover o filtro.`
                    : `Filtrar pela curva ${item.curve}`
                }
                className={`block rounded-2xl border p-4 transition hover:shadow-md ${focusRing} ${curveTone(item.curve)} ${
                  active ? `ring-2 ${curveRing(item.curve)}` : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xl font-extrabold">{item.curve}</span>
                  <span className="text-xs font-bold">{pct(item.share)} da base</span>
                </div>
                <p className="mt-2 text-sm font-extrabold">
                  {number(item.items)} produto{item.items === 1 ? "" : "s"}
                  <span className="ml-1.5 text-[11px] font-semibold opacity-80">
                    ({pct(item.productsShare)} do mix)
                  </span>
                </p>
                <p className="mt-1 text-xs">
                  {metric === "revenue"
                    ? money(item.baseValue)
                    : `${number(item.baseValue)} unidades`}
                </p>
                <p className="mt-2 text-[11px] font-bold underline-offset-2">
                  {active ? "Filtrando · tocar para limpar" : "Ver estes produtos →"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="font-bold text-texto">Radar de ações</h2>
          <p className="mt-1 text-xs leading-5 text-cinza">
            Cruza a curva com estoque, visitas à página e qualidade do cadastro para mostrar onde agir primeiro.
            Toque em um card para listar os produtos.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SIGNAL_ORDER.map((key) => {
            const copy = SIGNAL_COPY[key];
            const count = radarCounts[key];
            const active = params.signal === key;
            return (
              <Link
                key={key}
                href={abcHref(params, { signal: active ? null : key })}
                aria-current={active ? "true" : undefined}
                className={`block rounded-2xl border p-4 transition hover:shadow-md ${focusRing} ${
                  count > 0 ? copy.tone : "border-rosa/10 bg-creme/40 text-cinza"
                } ${active ? "ring-2 ring-rosa-profundo" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-extrabold">{copy.title}</p>
                  <span className="text-2xl font-extrabold leading-none">{number(count)}</span>
                </div>
                <p className="mt-2 text-[11px] leading-4 opacity-90">{copy.advice}</p>
              </Link>
            );
          })}

          <Link
            href="/admin/analise/buscas"
            className={`block rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-800 transition hover:shadow-md ${focusRing}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-extrabold">Demanda sem resposta</p>
              <span className="text-2xl font-extrabold leading-none">{number(zeroResultSearches)}</span>
            </div>
            <p className="mt-2 text-[11px] leading-4 opacity-90">
              Buscas sem resultado nos últimos 30 dias. Veja os termos: podem virar produto novo, sinônimo ou ajuste de nome.
            </p>
          </Link>
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-bold text-texto">
              {filtering ? "Produtos do filtro" : "Produtos mais vendidos"}
            </h2>
            <p className="mt-1 text-xs text-cinza">
              Ordenado por {metric === "revenue" ? "faturamento" : "quantidade vendida"} no período.
              {filtering && filtered.length > 0 && (
                <>
                  {" "}
                  {number(filtered.length)} produto{filtered.length === 1 ? "" : "s"} ·{" "}
                  {money(filteredRevenue)} · {number(filteredUnits)} un. · {pct(filteredShare)} da base.
                </>
              )}
            </p>
          </div>
          <span className="text-[10px] font-bold text-cinza">
            Mostrando {number(visible.length)} de {number(filtered.length)}
          </span>
        </div>

        {allRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-rosa/20 bg-creme/40 p-5 text-sm text-cinza">
            Nenhuma venda finalizada foi registrada no período selecionado.
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-rosa/20 bg-creme/40 p-5 text-sm text-cinza">
            Nenhum produto encontrado com esses filtros.{" "}
            <Link href={clearHref} className="font-bold text-rosa-profundo underline">
              Limpar filtros
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left">
              <thead>
                <tr className="border-b border-rosa/10 text-[10px] uppercase tracking-wide text-cinza">
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">Produto</th>
                  <th className="px-3 py-3">Curva</th>
                  <th className="px-3 py-3 text-right">Unidades</th>
                  <th className="px-3 py-3 text-right">Faturamento</th>
                  <th className="px-3 py-3 text-right">Participação</th>
                  <th className="px-3 py-3 text-right">Acumulado</th>
                  <th className="px-3 py-3 text-right" title="Visualizações da página do produto no período">
                    Visitas
                  </th>
                  <th className="px-3 py-3 text-right" title="Pedidos finalizados ÷ visitas à página do produto">
                    Conversão
                  </th>
                  <th className="px-3 py-3 text-right">Estoque</th>
                  <th className="px-3 py-3 text-right" title="Quantos dias o estoque dura no ritmo de venda do período">
                    Cobertura
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <ProductRow key={row.productId} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {more !== null && filtered.length > visible.length && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {more !== "all" && (
              <Link
                href={abcHref(params, { limit: more })}
                className={`rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo ${focusRing}`}
              >
                Mostrar mais (até {more})
              </Link>
            )}
            <Link
              href={abcHref(params, { limit: "all" })}
              className={`rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-xs font-bold text-rosa-profundo ${focusRing}`}
            >
              Ver todos os {number(filtered.length)}
            </Link>
          </div>
        )}
      </section>

      {visitedWithoutSale.length > 0 && (
        <section className="mb-5 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="font-bold text-texto">Visitados, mas sem venda no período</h2>
            <p className="mt-1 text-xs leading-5 text-cinza">
              Estas páginas recebem tráfego e não viraram pedido. Revise preço, foto, descrição e estoque antes de investir em mais divulgação.
            </p>
          </div>
          <ul className="divide-y divide-rosa/10">
            {visitedWithoutSale.map((item) => (
              <li key={item.product.id} className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/admin/produtos/${item.product.id}`}
                    className={`font-bold text-texto hover:text-rosa-profundo hover:underline ${focusRing}`}
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-0.5 text-[10px] text-cinza">{item.product.brand}</p>
                  <GapChips gaps={item.gaps} />
                </div>
                <p className="shrink-0 text-xs font-semibold text-texto">
                  {number(item.views)} visitas · {number(item.carts)} no carrinho ·{" "}
                  <span className={item.stock > 0 ? "" : "font-bold text-red-700"}>
                    {item.stock > 0 ? `${number(item.stock)} em estoque` : "sem estoque"}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-5 grid gap-4 lg:grid-cols-3">
        {(["A", "B", "C"] as const).map((curve) => {
          const summary = curveSummary.find((item) => item.curve === curve);
          const active = params.curve === curve;
          return (
            <Link
              key={curve}
              href={abcHref(params, { curve: active ? null : curve })}
              aria-current={active ? "true" : undefined}
              className={`block rounded-2xl border border-rosa/10 bg-creme/50 p-4 transition hover:border-rosa/30 hover:shadow-md ${focusRing} ${
                active ? "ring-2 ring-rosa-profundo" : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-lg font-extrabold text-rosa-profundo">Curva {curve}</p>
                <span className="text-[11px] font-bold text-cinza">{CURVE_COPY[curve].range}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-cinza">{CURVE_COPY[curve].detail}</p>
              <p className="mt-3 text-[11px] font-bold text-rosa-profundo">
                {active
                  ? "Filtrando · tocar para limpar"
                  : `Ver ${number(summary?.items ?? 0)} produto${summary?.items === 1 ? "" : "s"} →`}
              </p>
            </Link>
          );
        })}
      </section>

      <details className="mb-5 rounded-2xl border border-rosa/10 bg-white p-4 text-xs leading-5 text-cinza shadow-sm">
        <summary className="cursor-pointer font-bold text-texto">Como ler os números e os sinais</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-texto">Visitas e conversão:</strong> visitas são visualizações da página do produto no catálogo.
            Vendas combinadas no WhatsApp ou lançadas no balcão não passam pela página, então use a conversão para comparar produtos entre si, não como taxa absoluta.
          </li>
          <li>
            <strong className="text-texto">Cobertura:</strong> estoque atual ÷ média diária vendida no período ({periodDays} dia{periodDays === 1 ? "" : "s"} neste filtro).
            Abaixo de {REPLENISH_LEAD_DAYS} dias aparece em vermelho (prazo de uma compra na Shopee) e abaixo de 15 dias em laranja.
          </li>
          <li>
            <strong className="text-texto">Página fraca:</strong> falta foto, texto de descrição (mínimo de 80 caracteres), ALT nas fotos, SKU/EAN, ou o nome é curto demais ou passa de 70 caracteres.
            Só é apontado para as curvas A e B.
          </li>
          <li>
            <strong className="text-texto">Pouca vitrine:</strong> curva A com menos de {LOW_VISIBILITY_VIEWS} visitas.
            <strong className="ml-1 text-texto">Pouco pedido:</strong> mais de {HIGH_TRAFFIC_VIEWS} visitas e conversão abaixo de {LOW_CONVERSION_PCT.toLocaleString("pt-BR")}%.
          </li>
        </ul>
      </details>

      <p className="text-[10px] leading-4 text-cinza">
        A curva é calculada por produto usando apenas pedidos FINALIZADOS. Cancelamentos não entram na base.
        Produtos sem venda no período ficam fora da curva e aparecem no indicador “Sem venda no período”.
      </p>
    </div>
  );
}

function ProductRow({ row }: { row: AbcRow }) {
  return (
    <tr className="border-b border-rosa/10 align-top last:border-b-0">
      <td className="px-3 py-3 text-sm font-extrabold text-rosa-profundo">{row.rank}</td>
      <td className="max-w-[340px] px-3 py-3">
        {!row.hasRecord ? (
          <span className="font-bold text-texto">{row.name}</span>
        ) : (
          <Link
            href={`/admin/produtos/${row.productId}`}
            className={`font-bold text-texto hover:text-rosa-profundo hover:underline ${focusRing}`}
          >
            {row.name}
          </Link>
        )}
        <p className="mt-0.5 text-[10px] text-cinza">
          {row.brand}
          {row.categoryName && <span> · {row.categoryName}</span>}
          {!row.inCatalog && (
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
              inativo
            </span>
          )}
          {row.inCatalog && (
            <a
              href={productPath(row)}
              target="_blank"
              rel="noopener noreferrer"
              className={`ml-1.5 font-bold text-rosa-profundo hover:underline ${focusRing}`}
            >
              ver na loja ↗
            </a>
          )}
        </p>
        {row.signals.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {row.signals.map((signal) => (
              <span
                key={signal}
                className={`rounded-full border px-2 py-0.5 text-[9px] font-extrabold ${SIGNAL_COPY[signal].tone}`}
              >
                {SIGNAL_COPY[signal].label}
              </span>
            ))}
          </div>
        )}
        {row.signals.includes("conteudo") && <GapChips gaps={row.gaps} />}
      </td>
      <td className="px-3 py-3">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${curveTone(row.curve)}`}
        >
          {row.curve}
        </span>
      </td>
      <td className="px-3 py-3 text-right text-sm font-semibold text-texto">{number(row.units)}</td>
      <td className="px-3 py-3 text-right text-sm font-semibold text-texto">{money(row.revenue)}</td>
      <td className="px-3 py-3 text-right text-xs font-semibold text-texto">{pct(row.share)}</td>
      <td className="px-3 py-3 text-right text-xs font-semibold text-texto">{pct(row.cumulative)}</td>
      <td className="px-3 py-3 text-right text-xs font-semibold text-texto">{number(row.views)}</td>
      <td className="px-3 py-3 text-right text-xs font-semibold text-texto">
        {conversionLabel(row.conversion)}
      </td>
      <td
        className={`px-3 py-3 text-right text-xs font-bold ${row.stockQty > 0 ? "text-texto" : "text-red-700"}`}
      >
        {number(row.stockQty)}
      </td>
      <td className={`px-3 py-3 text-right text-xs font-bold ${coverageTone(row.coverageDays)}`}>
        {row.coverageDays === null ? "—" : `${number(Math.round(row.coverageDays))} d`}
      </td>
    </tr>
  );
}

function GapChips({ gaps }: { gaps: SeoGap[] }) {
  if (gaps.length === 0) return null;
  const ordered = [...gaps].sort((a, b) => b.weight - a.weight);
  const shown = ordered.slice(0, 3);
  const hidden = ordered.length - shown.length;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {shown.map((gap) => (
        <span
          key={gap.key}
          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold text-slate-600"
        >
          {gap.label}
        </span>
      ))}
      {hidden > 0 && (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold text-slate-500">
          +{hidden}
        </span>
      )}
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
