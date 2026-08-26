import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Period = "today" | "7d" | "30d" | "month" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Este mês" },
  { value: "all", label: "Todo período" },
];

const ANALYSIS_AREAS = [
  { href: "/admin/analise/produtos", title: "Desempenho", description: "Produtos, carrinhos e vendas." },
  { href: "/admin/analise/oportunidades", title: "Oportunidades", description: "Prioridades comerciais e de cadastro." },
  { href: "/admin/analise/buscas", title: "Buscas", description: "Demanda e buscas sem resultado." },
  { href: "/admin/analise/qualidade", title: "Qualidade", description: "Saúde dos cadastros." },
];

const JOURNEY_EVENTS = [
  "page_view",
  "navigation_click",
  "product_view",
  "add_to_cart",
  "begin_checkout",
  "order_created",
  "order_finalized",
  "whatsapp_click",
] as const;

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
  if (period === "today") return { gte: today, lt: tomorrow };
  if (period === "month") return { gte: saoPauloMidnightUtc(year, month, 1), lt: tomorrow };
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (period === "7d" ? 6 : 29));
  return { gte: start, lt: tomorrow };
}

function pct(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function conversion(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0;
}

function sourceLabel(origin: string) {
  if (origin === "meta") return "Meta";
  if (origin === "direto") return "Direto";
  if (origin === "facebook.com") return "Facebook";
  if (origin === "instagram" || origin === "instagram.com") return "Instagram";
  if (origin === "google" || origin === "google.com") return "Google";
  if (origin === "tiktok" || origin === "tiktok.com") return "TikTok";
  if (origin === "vercel.com") return "Vercel";
  return origin;
}

function isTechnicalOrigin(origin: string | null) {
  const normalized = origin?.trim().toLowerCase() ?? "";
  return normalized.includes("vercel") || normalized.includes("preview");
}

function getDataMaturity(visitorCount: number) {
  if (visitorCount < 10) return { label: "Coleta inicial", detail: "Amostra muito pequena; use para validar a coleta.", tone: "border-amber-200 bg-amber-50 text-amber-800" };
  if (visitorCount < 50) return { label: "Amostra pequena", detail: "Já há sinais, mas eles ainda podem oscilar bastante.", tone: "border-amber-200 bg-amber-50 text-amber-800" };
  if (visitorCount < 200) return { label: "Dados em formação", detail: "Já é possível comparar tendências; confirme padrões em mais de um período.", tone: "border-rosa/20 bg-rosa/5 text-texto" };
  return { label: "Amostra maior", detail: "Há volume operacional para comparações mais úteis.", tone: "border-green-200 bg-green-50 text-green-800" };
}

function getMainInsight({
  visitors,
  catalogVisitors,
  categoryVisitors,
  productVisitors,
  cartVisitors,
  orderVisitors,
}: {
  visitors: number;
  catalogVisitors: number;
  categoryVisitors: number;
  productVisitors: number;
  cartVisitors: number;
  orderVisitors: number;
}) {
  if (visitors === 0) return { title: "Ainda sem tráfego comercial", detail: "A coleta está pronta; aguarde visitantes reais para formar o funil.", tone: "border-slate-200 bg-slate-50" };
  if (catalogVisitors === 0) return { title: "Atenção à saída da Home", detail: `${visitors.toLocaleString("pt-BR")} visitantes chegaram, mas nenhum clique em Produtos foi identificado com a nova telemetria.`, tone: "border-amber-200 bg-amber-50" };
  if (productVisitors === 0) return { title: "O gargalo está antes do produto", detail: `${catalogVisitors.toLocaleString("pt-BR")} visitantes abriram Produtos, mas nenhum chegou a uma ficha de produto no funil comercial.`, tone: "border-amber-200 bg-amber-50" };
  if (cartVisitors === 0) return { title: "Há interesse, mas ainda sem carrinho", detail: `${productVisitors.toLocaleString("pt-BR")} visitantes viram produtos. Revise oferta, preço, variações e clareza do botão de compra.`, tone: "border-amber-200 bg-amber-50" };
  if (orderVisitors === 0) return { title: "Carrinho sem pedido", detail: `${cartVisitors.toLocaleString("pt-BR")} visitantes adicionaram itens, mas ainda não criaram pedido. O checkout merece atenção.`, tone: "border-amber-200 bg-amber-50" };
  return { title: "O funil já possui intenção comercial", detail: `${orderVisitors.toLocaleString("pt-BR")} visitantes chegaram à criação de pedido no período.`, tone: "border-green-200 bg-green-50" };
}

export default async function AnalisePage({ searchParams }: { searchParams?: Promise<{ period?: string }> }) {
  const params = searchParams ? await searchParams : undefined;
  const requested = params?.period;
  const period: Period = PERIODS.some((item) => item.value === requested) ? (requested as Period) : "7d";
  const range = getPeriodRange(period);
  const where = range ? { createdAt: range } : {};

  const [eventGroups, journeyRows, sourcePageGroups, searchGroups, reportableSearchCount, productGroups, campaignGroups, finalizedAggregate] = await Promise.all([
    prisma.analyticsEvent.groupBy({ by: ["event"], where, _count: { _all: true } }),
    prisma.analyticsEvent.findMany({
      where: { ...where, event: { in: [...JOURNEY_EVENTS] } },
      select: { origin: true, event: true, sessionId: true, pagePath: true, context: true, categorySlug: true, productId: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["origin", "pagePath"],
      where: { ...where, event: "page_view", origin: { not: null } },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["query"],
      where: { ...where, event: "search", query: { not: null }, OR: [{ context: null }, { context: { not: "search_submit" } }] },
      _count: { _all: true },
      orderBy: { _count: { query: "desc" } },
      take: 10,
    }),
    prisma.analyticsEvent.count({ where: { ...where, event: "search", OR: [{ context: null }, { context: { not: "search_submit" } }] } }),
    prisma.analyticsEvent.groupBy({
      by: ["productId"],
      where: { ...where, event: "product_view", productId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { productId: "desc" } },
      take: 10,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["utmCampaign"],
      where: { ...where, utmCampaign: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { utmCampaign: "desc" } },
      take: 8,
    }),
    prisma.analyticsEvent.aggregate({
      where: { ...where, event: "order_finalized" },
      _count: { _all: true },
      _sum: { value: true },
    }),
  ]);

  const eventCount = new Map(eventGroups.map((item) => [item.event, item._count._all]));
  const stageVisitors = new Map<string, Set<string>>();
  const technicalSessions = new Set<string>();
  let technicalPageViews = 0;

  type SourceData = {
    origin: string;
    visitors: Set<string>;
    catalogVisitors: Set<string>;
    categoryVisitors: Set<string>;
    productVisitors: Set<string>;
    cartVisitors: Set<string>;
    checkoutVisitors: Set<string>;
    orderVisitors: Set<string>;
    saleVisitors: Set<string>;
    pageViews: number;
    homePageViews: number;
  };

  const sourceMap = new Map<string, SourceData>();
  function getSource(origin: string) {
    let source = sourceMap.get(origin);
    if (!source) {
      source = {
        origin,
        visitors: new Set(),
        catalogVisitors: new Set(),
        categoryVisitors: new Set(),
        productVisitors: new Set(),
        cartVisitors: new Set(),
        checkoutVisitors: new Set(),
        orderVisitors: new Set(),
        saleVisitors: new Set(),
        pageViews: 0,
        homePageViews: 0,
      };
      sourceMap.set(origin, source);
    }
    return source;
  }

  function addStage(stage: string, sessionId: string) {
    let set = stageVisitors.get(stage);
    if (!set) {
      set = new Set<string>();
      stageVisitors.set(stage, set);
    }
    set.add(sessionId);
  }

  for (const row of journeyRows) {
    if (isTechnicalOrigin(row.origin)) {
      technicalSessions.add(row.sessionId);
      continue;
    }

    if (row.event === "page_view") addStage("visitor", row.sessionId);
    if (row.event === "navigation_click" && ["hero_products", "bottom_nav_products", "catalog_products"].includes(row.context ?? "")) addStage("catalog", row.sessionId);
    if (row.event === "navigation_click" && row.context === "category_link") addStage("category", row.sessionId);
    if (row.event === "product_view") addStage("product", row.sessionId);
    if (row.event === "add_to_cart") addStage("cart", row.sessionId);
    if (row.event === "begin_checkout") addStage("checkout", row.sessionId);
    if (row.event === "order_created") addStage("order", row.sessionId);
    if (row.event === "order_finalized") addStage("sale", row.sessionId);
    if (row.event === "whatsapp_click") addStage("whatsapp", row.sessionId);

    if (!row.origin) continue;
    const source = getSource(row.origin);
    if (row.event === "page_view") source.visitors.add(row.sessionId);
    if (row.event === "navigation_click" && ["hero_products", "bottom_nav_products", "catalog_products"].includes(row.context ?? "")) source.catalogVisitors.add(row.sessionId);
    if (row.event === "navigation_click" && row.context === "category_link") source.categoryVisitors.add(row.sessionId);
    if (row.event === "product_view") source.productVisitors.add(row.sessionId);
    if (row.event === "add_to_cart") source.cartVisitors.add(row.sessionId);
    if (row.event === "begin_checkout") source.checkoutVisitors.add(row.sessionId);
    if (row.event === "order_created") source.orderVisitors.add(row.sessionId);
    if (row.event === "order_finalized") source.saleVisitors.add(row.sessionId);
  }

  for (const row of sourcePageGroups) {
    if (!row.origin) continue;
    if (isTechnicalOrigin(row.origin)) {
      technicalPageViews += row._count._all;
      continue;
    }
    const source = getSource(row.origin);
    source.pageViews += row._count._all;
    if (row.pagePath === "/") source.homePageViews += row._count._all;
  }

  const acquisitionSources = Array.from(sourceMap.values())
    .filter((source) => source.visitors.size > 0 || source.pageViews > 0)
    .sort((a, b) => b.visitors.size - a.visitors.size || b.pageViews - a.pageViews)
    .slice(0, 8);

  const visitorCount = stageVisitors.get("visitor")?.size ?? 0;
  const catalogVisitors = stageVisitors.get("catalog")?.size ?? 0;
  const categoryVisitors = stageVisitors.get("category")?.size ?? 0;
  const productVisitors = stageVisitors.get("product")?.size ?? 0;
  const cartVisitors = stageVisitors.get("cart")?.size ?? 0;
  const checkoutVisitors = stageVisitors.get("checkout")?.size ?? 0;
  const orderVisitors = stageVisitors.get("order")?.size ?? 0;
  const saleVisitors = stageVisitors.get("sale")?.size ?? 0;
  const whatsappVisitors = stageVisitors.get("whatsapp")?.size ?? 0;
  const interestedVisitors = new Set([
    ...(stageVisitors.get("product") ?? []),
    ...(stageVisitors.get("cart") ?? []),
    ...(stageVisitors.get("checkout") ?? []),
    ...(stageVisitors.get("whatsapp") ?? []),
  ]).size;

  const pageViews = eventCount.get("page_view") ?? 0;
  const productViews = eventCount.get("product_view") ?? 0;
  const addToCart = eventCount.get("add_to_cart") ?? 0;
  const checkout = eventCount.get("begin_checkout") ?? 0;
  const ordersCreated = eventCount.get("order_created") ?? 0;
  const finalizedSales = finalizedAggregate._count._all;
  const finalizedRevenue = Number(finalizedAggregate._sum.value ?? 0);
  const whatsapp = eventCount.get("whatsapp_click") ?? 0;
  const searches = reportableSearchCount;
  const maturity = getDataMaturity(visitorCount);
  const insight = getMainInsight({ visitors: visitorCount, catalogVisitors, categoryVisitors, productVisitors, cartVisitors, orderVisitors });
  const technicalProductViews = Math.max(0, productViews - productVisitors);

  const productIds = productGroups.map((item) => item.productId).filter((id): id is string => Boolean(id));
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, brand: true } })
    : [];
  const productMap = new Map(products.map((product) => [product.id, product]));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Dados próprios</p>
        <h1 className="font-serif text-2xl font-bold text-texto">Análise do catálogo</h1>
        <p className="mt-1 max-w-3xl text-sm text-cinza">Entenda o que aconteceu, onde o cliente parou e qual etapa merece atenção.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {PERIODS.map((item) => {
          const active = item.value === period;
          return (
            <Link key={item.value} href={item.value === "7d" ? "/admin/analise" : `/admin/analise?period=${item.value}`} className={`rounded-xl border px-3 py-2 text-xs font-bold ${active ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-rosa/15 bg-white text-cinza"}`}>
              {item.label}
            </Link>
          );
        })}
      </div>

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ExecutiveMetric label="Visitantes" value={visitorCount} helper={`${pageViews.toLocaleString("pt-BR")} páginas vistas`} />
        <ExecutiveMetric label="Interessados" value={interestedVisitors} helper={`${pct(conversion(interestedVisitors, visitorCount))} dos visitantes`} />
        <ExecutiveMetric label="Pedidos" value={orderVisitors} helper={`${ordersCreated.toLocaleString("pt-BR")} eventos de pedido`} />
        <ExecutiveMetric label="Receita" value={money(finalizedRevenue)} helper={`${finalizedSales.toLocaleString("pt-BR")} vendas finalizadas`} />
      </section>

      <section className={`mb-4 rounded-2xl border p-4 ${insight.tone}`}>
        <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Principal leitura do período</p>
        <p className="mt-1 text-base font-extrabold text-texto">{insight.title}</p>
        <p className="mt-1 text-xs leading-5 text-cinza">{insight.detail}</p>
      </section>

      <section className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-texto">Jornada do cliente</h2>
            <p className="mt-1 text-xs leading-5 text-cinza">Visitantes únicos por etapa. A nova telemetria separa clique em Produtos, categoria e ficha de produto.</p>
          </div>
          <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right sm:block">
            <p className="text-[9px] font-bold uppercase text-slate-500">Técnico</p>
            <p className="text-xs font-bold text-slate-700">{technicalSessions.size} sessões excluídas</p>
          </div>
        </div>

        <div className="space-y-1">
          <JourneyStep label="Visitantes" value={visitorCount} total={visitorCount} first />
          <JourneyStep label="Abriram Produtos" value={catalogVisitors} total={visitorCount} />
          <JourneyStep label="Abriram categoria" value={categoryVisitors} total={visitorCount} />
          <JourneyStep label="Viram produto" value={productVisitors} total={visitorCount} />
          <JourneyStep label="Adicionaram ao carrinho" value={cartVisitors} total={visitorCount} />
          <JourneyStep label="Iniciaram checkout" value={checkoutVisitors} total={visitorCount} />
          <JourneyStep label="Criaram pedido" value={orderVisitors} total={visitorCount} />
          <JourneyStep label="Venda finalizada" value={saleVisitors} total={visitorCount} last />
        </div>

        {(technicalProductViews > 0 || technicalPageViews > 0) && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[10px] leading-4 text-slate-600">
            Métrica técnica separada: {technicalPageViews.toLocaleString("pt-BR")} páginas de Vercel/preview. {technicalProductViews > 0 ? `${technicalProductViews.toLocaleString("pt-BR")} view(s) de produto total(is) não entram no funil comercial.` : ""}
          </div>
        )}
        <p className="mt-3 text-[10px] text-cinza">Pedido criado não é venda. Venda só entra após status FINALIZADO.</p>
      </section>

      <section className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="font-bold text-texto">Origem do tráfego</h2>
          <p className="mt-1 text-xs leading-5 text-cinza">Compare rapidamente quem apenas chega e quem avança no catálogo.</p>
        </div>
        {acquisitionSources.length ? (
          <div className="divide-y divide-rosa/10">
            {acquisitionSources.map((source) => (
              <SourceRow
                key={source.origin}
                origin={source.origin}
                visitors={source.visitors.size}
                pageViews={source.pageViews}
                homePageViews={source.homePageViews}
                catalogVisitors={source.catalogVisitors.size}
                categoryVisitors={source.categoryVisitors.size}
                productVisitors={source.productVisitors.size}
                cartVisitors={source.cartVisitors.size}
                orderVisitors={source.orderVisitors.size}
                saleVisitors={source.saleVisitors.size}
              />
            ))}
          </div>
        ) : <p className="text-xs text-cinza">Ainda não há origem comercial identificada neste período.</p>}
      </section>

      <section className={`mb-5 rounded-2xl border p-3 ${maturity.tone}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wide opacity-70">Maturidade da amostra</p>
            <p className="text-sm font-extrabold">{maturity.label}</p>
          </div>
          <p className="text-xs font-bold">{visitorCount.toLocaleString("pt-BR")} visitantes</p>
        </div>
        <p className="mt-1 text-[10px] leading-4 opacity-80">{maturity.detail}</p>
      </section>

      <div className="mb-5 grid gap-4 xl:grid-cols-2">
        <Panel title="Produtos mais visualizados" empty="Ainda não há visualizações de produto neste período.">
          {productGroups.map((item, index) => {
            const product = item.productId ? productMap.get(item.productId) : null;
            return <Row key={item.productId ?? index} label={product ? `${product.name} · ${product.brand}` : "Produto não identificado"} value={item._count._all} />;
          })}
        </Panel>

        <Panel title={`Buscas internas (${searches})`} empty="Ainda não há buscas registradas neste período.">
          {searchGroups.map((item, index) => <Row key={item.query ?? index} label={item.query ?? "Busca sem termo"} value={item._count._all} />)}
        </Panel>

        <Panel title="Campanhas UTM" empty="Ainda não há campanhas UTM registradas neste período.">
          {campaignGroups.map((item, index) => <Row key={item.utmCampaign ?? index} label={item.utmCampaign ?? "Sem campanha"} value={item._count._all} />)}
        </Panel>
      </div>

      <section className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ANALYSIS_AREAS.map((area) => (
          <Link key={area.href} href={area.href} className="rounded-xl border border-rosa/10 bg-white p-3 shadow-sm transition hover:border-rosa/30">
            <p className="text-xs font-bold text-texto">{area.title}</p>
            <p className="mt-1 text-[10px] leading-4 text-cinza">{area.description}</p>
            <p className="mt-2 text-[10px] font-bold text-rosa-profundo">Abrir →</p>
          </Link>
        ))}
      </section>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <SmallMetric label="Views de produto" value={productViews} />
        <SmallMetric label="Carrinhos" value={addToCart} />
        <SmallMetric label="Checkouts" value={checkout} />
        <SmallMetric label="WhatsApp" value={whatsapp} helper={`${whatsappVisitors} visitantes`} />
        <SmallMetric label="Pedidos criados" value={ordersCreated} />
        <SmallMetric label="Vendas" value={finalizedSales} />
      </div>

      <p className="text-[10px] leading-4 text-cinza">Dados first-party do catálogo. Eles começam a acumular após a ativação de cada evento e não reconstroem ações anteriores. Compare atribuição publicitária também com GA4 e Meta.</p>
    </div>
  );
}

function ExecutiveMetric({ label, value, helper }: { label: string; value: number | string; helper: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-texto">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p>
      <p className="mt-1 text-[10px] text-cinza">{helper}</p>
    </div>
  );
}

function JourneyStep({ label, value, total, first = false, last = false }: { label: string; value: number; total: number; first?: boolean; last?: boolean }) {
  const rate = first ? 100 : conversion(value, total);
  return (
    <div>
      {!first && <div className="ml-5 h-3 w-px bg-rosa/20" />}
      <div className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${last && value > 0 ? "border-green-200 bg-green-50" : "border-rosa/10 bg-creme/40"}`}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">{label}</p>
          <p className="text-lg font-extrabold text-texto">{value.toLocaleString("pt-BR")}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-rosa-profundo">{pct(rate)}</span>
      </div>
    </div>
  );
}

function SourceRow({ origin, visitors, pageViews, homePageViews, catalogVisitors, categoryVisitors, productVisitors, cartVisitors, orderVisitors, saleVisitors }: {
  origin: string;
  visitors: number;
  pageViews: number;
  homePageViews: number;
  catalogVisitors: number;
  categoryVisitors: number;
  productVisitors: number;
  cartVisitors: number;
  orderVisitors: number;
  saleVisitors: number;
}) {
  const homeShare = pageViews > 0 ? conversion(homePageViews, pageViews) : 0;
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-texto">{sourceLabel(origin)}</p>
          <p className="mt-0.5 text-[10px] text-cinza">{visitors.toLocaleString("pt-BR")} visitantes · {pageViews.toLocaleString("pt-BR")} páginas · {pct(homeShare)} das páginas na Home</p>
        </div>
        <span className="shrink-0 rounded-full bg-creme px-2.5 py-1 text-[10px] font-bold text-rosa-profundo">{pct(conversion(productVisitors, visitors))} até produto</span>
      </div>
      <div className="mt-2 overflow-x-auto pb-1">
        <div className="flex min-w-max items-center gap-1 text-[10px] font-semibold text-cinza">
          <StagePill label="Visita" value={visitors} />
          <Arrow />
          <StagePill label="Produtos" value={catalogVisitors} />
          <Arrow />
          <StagePill label="Categoria" value={categoryVisitors} />
          <Arrow />
          <StagePill label="Produto" value={productVisitors} />
          <Arrow />
          <StagePill label="Carrinho" value={cartVisitors} />
          <Arrow />
          <StagePill label="Pedido" value={orderVisitors} />
          <Arrow />
          <StagePill label="Venda" value={saleVisitors} />
        </div>
      </div>
    </div>
  );
}

function StagePill({ label, value }: { label: string; value: number }) {
  return <span className="rounded-lg border border-rosa/10 bg-creme/50 px-2 py-1.5"><strong className="text-texto">{value}</strong> {label}</span>;
}

function Arrow() {
  return <span className="text-rosa-profundo">→</span>;
}

function SmallMetric({ label, value, helper }: { label: string; value: number; helper?: string }) {
  return (
    <div className="rounded-xl border border-rosa/10 bg-white p-3">
      <p className="text-lg font-extrabold text-texto">{value.toLocaleString("pt-BR")}</p>
      <p className="text-[10px] text-cinza">{label}</p>
      {helper && <p className="mt-0.5 text-[9px] text-cinza">{helper}</p>}
    </div>
  );
}

function Panel({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-bold text-texto">{title}</h2>
      {hasChildren ? <div className="divide-y divide-rosa/10">{children}</div> : <p className="text-xs text-cinza">{empty}</p>}
    </section>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <p className="min-w-0 truncate text-xs font-semibold text-texto">{label}</p>
      <span className="shrink-0 rounded-full bg-creme px-2.5 py-1 text-[11px] font-bold text-rosa-profundo">{value.toLocaleString("pt-BR")}</span>
    </div>
  );
}
