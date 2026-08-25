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
  {
    href: "/admin/analise/produtos",
    title: "Desempenho",
    description: "Visualizações, carrinhos, vendas, unidades e receita por produto.",
  },
  {
    href: "/admin/analise/oportunidades",
    title: "Oportunidades",
    description: "Fila priorizada de produtos que merecem revisão comercial ou de cadastro.",
  },
  {
    href: "/admin/analise/buscas",
    title: "Buscas",
    description: "Termos pesquisados, demanda interna e buscas sem resultado.",
  },
  {
    href: "/admin/analise/qualidade",
    title: "Qualidade dos cadastros",
    description: "Auditoria de descrição, imagem, preço, estoque, marca e EAN/GTIN.",
  },
];

const FUNNEL_EVENTS = [
  "page_view",
  "product_view",
  "add_to_cart",
  "begin_checkout",
  "order_created",
  "order_finalized",
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

function getDataMaturity(visitorCount: number) {
  if (visitorCount < 10) {
    return {
      label: "Coleta inicial",
      detail: "Amostra muito pequena. Use os números apenas para confirmar que a coleta está funcionando; evite decisões de preço, estoque ou campanha.",
      tone: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }
  if (visitorCount < 50) {
    return {
      label: "Amostra pequena",
      detail: "Já é possível observar sinais, mas diferenças entre produtos e campanhas ainda podem oscilar bastante.",
      tone: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }
  if (visitorCount < 200) {
    return {
      label: "Dados em formação",
      detail: "O volume já ajuda a comparar tendências. Confirme padrões em mais de um período antes de mudanças relevantes.",
      tone: "border-rosa/20 bg-rosa/5 text-texto",
    };
  }
  return {
    label: "Amostra maior",
    detail: "Há volume operacional para comparações mais úteis. Continue considerando período, origem e contexto antes de concluir causa e efeito.",
    tone: "border-green-200 bg-green-50 text-green-800",
  };
}

export default async function AnalisePage({
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
  const where = range ? { createdAt: range } : {};

  const [eventGroups, stageRows, sourcePageGroups, searchGroups, productGroups, campaignGroups, finalizedAggregate] =
    await Promise.all([
      prisma.analyticsEvent.groupBy({
        by: ["event"],
        where,
        _count: { _all: true },
      }),
      prisma.analyticsEvent.findMany({
        where: { ...where, event: { in: [...FUNNEL_EVENTS] } },
        select: { origin: true, event: true, sessionId: true, pagePath: true },
        distinct: ["origin", "event", "sessionId", "pagePath"],
      }),
      prisma.analyticsEvent.groupBy({
        by: ["origin", "pagePath"],
        where: { ...where, event: "page_view", origin: { not: null } },
        _count: { _all: true },
      }),
      prisma.analyticsEvent.groupBy({
        by: ["query"],
        where: { ...where, event: "search", query: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { query: "desc" } },
        take: 10,
      }),
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
  const sourceMap = new Map<
    string,
    {
      origin: string;
      visitors: Set<string>;
      productVisitors: Set<string>;
      cartVisitors: Set<string>;
      checkoutVisitors: Set<string>;
      orderVisitors: Set<string>;
      saleVisitors: Set<string>;
      pageViews: number;
      homePageViews: number;
    }
  >();

  function getSource(origin: string) {
    let source = sourceMap.get(origin);
    if (!source) {
      source = {
        origin,
        visitors: new Set<string>(),
        productVisitors: new Set<string>(),
        cartVisitors: new Set<string>(),
        checkoutVisitors: new Set<string>(),
        orderVisitors: new Set<string>(),
        saleVisitors: new Set<string>(),
        pageViews: 0,
        homePageViews: 0,
      };
      sourceMap.set(origin, source);
    }
    return source;
  }

  for (const row of stageRows) {
    let globalSet = stageVisitors.get(row.event);
    if (!globalSet) {
      globalSet = new Set<string>();
      stageVisitors.set(row.event, globalSet);
    }
    globalSet.add(row.sessionId);

    if (!row.origin) continue;
    const source = getSource(row.origin);
    if (row.event === "page_view") source.visitors.add(row.sessionId);
    if (row.event === "product_view") source.productVisitors.add(row.sessionId);
    if (row.event === "add_to_cart") source.cartVisitors.add(row.sessionId);
    if (row.event === "begin_checkout") source.checkoutVisitors.add(row.sessionId);
    if (row.event === "order_created") source.orderVisitors.add(row.sessionId);
    if (row.event === "order_finalized") source.saleVisitors.add(row.sessionId);
  }

  for (const row of sourcePageGroups) {
    if (!row.origin) continue;
    const source = getSource(row.origin);
    source.pageViews += row._count._all;
    if (row.pagePath === "/") source.homePageViews += row._count._all;
  }

  const acquisitionSources = Array.from(sourceMap.values())
    .filter((source) => source.visitors.size > 0 || source.pageViews > 0)
    .sort((a, b) => b.visitors.size - a.visitors.size || b.pageViews - a.pageViews)
    .slice(0, 6);

  const visitorCount = stageVisitors.get("page_view")?.size ?? 0;
  const pageViews = eventCount.get("page_view") ?? 0;
  const productViews = eventCount.get("product_view") ?? 0;
  const addToCart = eventCount.get("add_to_cart") ?? 0;
  const checkout = eventCount.get("begin_checkout") ?? 0;
  const ordersCreated = eventCount.get("order_created") ?? 0;
  const finalizedSales = finalizedAggregate._count._all;
  const finalizedRevenue = Number(finalizedAggregate._sum.value ?? 0);
  const whatsapp = eventCount.get("whatsapp_click") ?? 0;
  const searches = eventCount.get("search") ?? 0;
  const productVisitors = stageVisitors.get("product_view")?.size ?? 0;
  const cartVisitors = stageVisitors.get("add_to_cart")?.size ?? 0;
  const checkoutVisitors = stageVisitors.get("begin_checkout")?.size ?? 0;
  const orderVisitors = stageVisitors.get("order_created")?.size ?? 0;
  const saleVisitors = stageVisitors.get("order_finalized")?.size ?? 0;
  const maturity = getDataMaturity(visitorCount);

  const productIds = productGroups
    .map((item) => item.productId)
    .filter((id): id is string => Boolean(id));
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, brand: true },
      })
    : [];
  const productMap = new Map(products.map((product) => [product.id, product]));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Dados próprios</p>
        <h1 className="font-serif text-2xl font-bold text-texto">Análise do catálogo</h1>
        <p className="mt-1 max-w-3xl text-sm text-cinza">
          Central de inteligência do catálogo. Reúne desempenho, oportunidades, buscas e qualidade dos cadastros sem poluir a operação diária.
        </p>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ANALYSIS_AREAS.map((area) => (
          <Link
            key={area.href}
            href={area.href}
            className="rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm transition hover:border-rosa/30 hover:shadow-md"
          >
            <p className="text-sm font-bold text-texto">{area.title}</p>
            <p className="mt-1 text-xs leading-5 text-cinza">{area.description}</p>
            <p className="mt-3 text-xs font-bold text-rosa-profundo">Abrir →</p>
          </Link>
        ))}
      </section>

      <div className="mb-5 flex flex-wrap gap-2">
        {PERIODS.map((item) => {
          const active = item.value === period;
          return (
            <Link
              key={item.value}
              href={item.value === "7d" ? "/admin/analise" : `/admin/analise?period=${item.value}`}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${active ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-rosa/15 bg-white text-cinza"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <section className={`mb-5 rounded-2xl border p-4 ${maturity.tone}`}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Maturidade da amostra</p>
            <p className="mt-1 text-base font-extrabold">{maturity.label}</p>
          </div>
          <p className="text-xs font-bold">{visitorCount.toLocaleString("pt-BR")} visitantes identificados no período</p>
        </div>
        <p className="mt-2 max-w-4xl text-xs leading-5 opacity-90">{maturity.detail}</p>
        <p className="mt-2 text-[10px] opacity-70">Faixa operacional de orientação; não representa significância estatística nem garante causalidade.</p>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Metric label="Visitantes identificados" value={visitorCount} />
        <Metric label="Páginas vistas" value={pageViews} />
        <Metric label="Views de produto" value={productViews} />
        <Metric label="Adições ao carrinho" value={addToCart} />
        <Metric label="Checkouts iniciados" value={checkout} />
        <Metric label="Pedidos criados" value={ordersCreated} />
        <Metric label="Vendas finalizadas" value={finalizedSales} />
        <Metric label="Receita finalizada" value={money(finalizedRevenue)} />
        <Metric label="Cliques no WhatsApp" value={whatsapp} />
      </div>

      <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-bold text-texto">Funil real do catálogo</h2>
          <p className="text-xs text-cinza">O funil usa visitantes anônimos únicos por etapa. Os cards acima mostram o volume total de ações.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <FunnelStep label="Visitantes" value={visitorCount} rate="100%" />
          <FunnelStep label="Viram produto" value={productVisitors} rate={pct(conversion(productVisitors, visitorCount))} />
          <FunnelStep label="Carrinho" value={cartVisitors} rate={pct(conversion(cartVisitors, visitorCount))} />
          <FunnelStep label="Checkout" value={checkoutVisitors} rate={pct(conversion(checkoutVisitors, visitorCount))} />
          <FunnelStep label="Pedidos" value={orderVisitors} rate={pct(conversion(orderVisitors, visitorCount))} />
          <FunnelStep label="Vendas" value={saleVisitors} rate={pct(conversion(saleVisitors, visitorCount))} />
        </div>
        <p className="mt-3 text-[11px] text-cinza">Pedido criado não é tratado como venda. Venda só entra após o status FINALIZADO.</p>
      </section>

      <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-bold text-texto">Aquisição por origem</h2>
          <p className="mt-1 text-xs leading-5 text-cinza">
            Mostra quem trouxe os visitantes e até onde eles avançaram. Visitantes e etapas são pessoas anônimas identificadas; páginas e Home são visualizações.
          </p>
        </div>
        {acquisitionSources.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {acquisitionSources.map((source) => (
              <AcquisitionCard
                key={source.origin}
                origin={source.origin}
                visitors={source.visitors.size}
                pageViews={source.pageViews}
                homePageViews={source.homePageViews}
                productVisitors={source.productVisitors.size}
                cartVisitors={source.cartVisitors.size}
                orderVisitors={source.orderVisitors.size}
                saleVisitors={source.saleVisitors.size}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-cinza">Ainda não há origem identificada neste período.</p>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Produtos mais visualizados" empty="Ainda não há visualizações de produto neste período.">
          {productGroups.map((item, index) => {
            const product = item.productId ? productMap.get(item.productId) : null;
            return <Row key={item.productId ?? index} label={product ? `${product.name} · ${product.brand}` : "Produto não identificado"} value={item._count._all} />;
          })}
        </Panel>

        <Panel title={`Buscas internas (${searches})`} empty="Ainda não há buscas registradas neste período.">
          {searchGroups.map((item, index) => (
            <Row key={item.query ?? index} label={item.query ?? "Busca sem termo"} value={item._count._all} />
          ))}
        </Panel>

        <Panel title="Eventos por campanha UTM" empty="Ainda não há campanhas UTM registradas neste período.">
          {campaignGroups.map((item, index) => (
            <Row key={item.utmCampaign ?? index} label={item.utmCampaign ?? "Sem campanha"} value={item._count._all} />
          ))}
        </Panel>
      </div>

      <p className="mt-5 text-[11px] leading-5 text-cinza">
        Estes números são dados first-party do catálogo e começam a acumular somente após a ativação desta coleta. Eles não recuperam visitas anteriores. Para audiência e atribuição publicitária, compare também com GA4 e Meta.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-2xl font-extrabold text-texto">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p><p className="mt-1 text-[11px] text-cinza">{label}</p></div>;
}

function FunnelStep({ label, value, rate }: { label: string; value: number; rate: string }) {
  return <div className="rounded-xl border border-rosa/10 bg-creme/50 p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-cinza">{label}</p><p className="mt-1 text-xl font-extrabold text-texto">{value.toLocaleString("pt-BR")}</p><p className="mt-1 text-xs font-bold text-rosa-profundo">{rate}</p></div>;
}

function AcquisitionCard({
  origin,
  visitors,
  pageViews,
  homePageViews,
  productVisitors,
  cartVisitors,
  orderVisitors,
  saleVisitors,
}: {
  origin: string;
  visitors: number;
  pageViews: number;
  homePageViews: number;
  productVisitors: number;
  cartVisitors: number;
  orderVisitors: number;
  saleVisitors: number;
}) {
  return (
    <div className="rounded-xl border border-rosa/10 bg-creme/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-texto">{sourceLabel(origin)}</p>
          {origin === "vercel.com" ? <p className="mt-0.5 text-[10px] text-cinza">Origem técnica; normalmente preview ou acesso interno.</p> : null}
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-rosa-profundo">
          {visitors.toLocaleString("pt-BR")} visitantes
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <SourceMetric label="Páginas" value={pageViews} />
        <SourceMetric label="Home" value={homePageViews} />
        <SourceMetric label="Viram produto" value={productVisitors} />
        <SourceMetric label="Carrinho" value={cartVisitors} />
        <SourceMetric label="Pedidos" value={orderVisitors} />
        <SourceMetric label="Vendas" value={saleVisitors} />
      </div>
    </div>
  );
}

function SourceMetric({ label, value }: { label: string; value: number }) {
  return <div><p className="text-base font-extrabold text-texto">{value.toLocaleString("pt-BR")}</p><p className="text-[10px] text-cinza">{label}</p></div>;
}

function Panel({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="mb-3 font-bold text-texto">{title}</h2>{hasChildren ? <div className="divide-y divide-rosa/10">{children}</div> : <p className="text-xs text-cinza">{empty}</p>}</section>;
}

function Row({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-4 py-2.5"><p className="min-w-0 truncate text-xs font-semibold text-texto">{label}</p><span className="shrink-0 rounded-full bg-creme px-2.5 py-1 text-[11px] font-bold text-rosa-profundo">{value.toLocaleString("pt-BR")}</span></div>;
}
